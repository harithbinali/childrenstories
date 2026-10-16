"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertWithinLimits, loadLimitSettings } from "@/lib/limits/check";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { saveRevision } from "@/lib/jobs/handlers/story";
import { pdfJobKey } from "@/lib/jobs/keys";
import { loadBookBundle } from "@/lib/book/load";
import { moderate } from "@/lib/ai/moderation";
import { hasEnv } from "@/lib/env";
import { removeObjects } from "@/lib/storage";
import { CheckoutError, startCheckout } from "@/lib/payments/checkout";
import { fail, ok, run, type ActionResult } from "@/lib/actions/result";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const NewBook = z.object({
  child_id: z.uuid(),
  character_id: z.uuid(),
  theme_id: z.uuid(),
  custom_idea: optionalText(1500),
  language: z.enum(["en", "ar"]),
  age_range: z.enum(["0-2", "3-5", "6-8", "9-12"]),
  page_count: z.coerce.number().refine((n) => [8, 12, 16].includes(n)),
  orientation: z.enum(["portrait", "landscape"]),
  lesson: optionalText(200),
  dedication: optionalText(300),
});

async function textSafe(text: string, userId: string): Promise<ActionResult<true>> {
  if (!text.trim()) return ok(true);
  if (!hasEnv("OPENAI_API_KEY")) return fail("moderation_unavailable");
  return (await moderate({ text }, { userId })).flagged ? fail("flagged") : ok(true);
}

async function ownBook(bookId: string) {
  const db = await createClient();
  const { data } = await db.from("books").select("id, owner_id, status, current_version_id, page_count").eq("id", bookId).maybeSingle();
  return data;
}

/** Wizard finish: creates the book and starts writing the story in the background. */
export async function createBook(_: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    const input = NewBook.safeParse(Object.fromEntries(form));
    if (!input.success) return fail("invalid_input");
    const v = input.data;

    const db = await createClient();
    const [{ data: character }, { data: theme }] = await Promise.all([
      db.from("characters").select("id, child_id, status, style_id").eq("id", v.character_id).maybeSingle(),
      db.from("story_themes").select("id, is_custom").eq("id", v.theme_id).eq("is_active", true).maybeSingle(),
    ]);
    if (!character || character.child_id !== v.child_id || !theme) return fail("not_found");
    if (character.status !== "approved") return fail("wrong_state");
    if (theme.is_custom && !v.custom_idea) return fail("invalid_input");

    const safe = await textSafe([v.custom_idea, v.lesson, v.dedication].filter(Boolean).join("\n"), user.id);
    if (!safe.ok) return safe;
    await assertWithinLimits(user.id, { kind: "new_book" });

    const admin = createAdminClient();
    const { data: product } = await admin.from("book_products").select("id").eq("page_count", v.page_count).eq("is_active", true).limit(1).maybeSingle();
    const { data: book, error } = await admin.from("books").insert({
      owner_id: user.id, child_id: v.child_id, character_id: v.character_id, theme_id: v.theme_id, style_id: character.style_id,
      product_id: product?.id ?? null, language: v.language, age_range: v.age_range, page_count: v.page_count,
      orientation: v.orientation, lesson: v.lesson, dedication: v.dedication, custom_idea: v.custom_idea, status: "story_generating",
    }).select("id").single();
    if (error || !book) throw new Error(error?.message);
    await enqueueJob({ type: "story_generate", ownerId: user.id, bookId: book.id, idempotencyKey: `story:${book.id}:1`, priority: 2 });
    revalidatePath("/dashboard", "layout");
    return ok({ id: book.id });
  });
}

/** Writes a fresh draft of the whole story (counts toward free story attempts). */
export async function regenerateStory(bookId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const book = await ownBook(bookId);
    if (!book) return fail("not_found");
    if (!["story_ready", "failed"].includes(book.status)) return fail("wrong_state");
    await assertWithinLimits(user.id, { kind: "story" }, bookId);
    const { count } = await createAdminClient().from("generation_jobs").select("id", { count: "exact", head: true }).eq("book_id", bookId).eq("type", "story_generate");
    await createAdminClient().from("books").update({ status: "story_generating" }).eq("id", bookId);
    await enqueueJob({ type: "story_generate", ownerId: user.id, bookId, idempotencyKey: `story:${bookId}:${(count ?? 0) + 1}`, priority: 2 });
    revalidatePath(`/dashboard/books/${bookId}`);
    return ok(undefined);
  });
}

const StoryEdits = z.object({
  title: z.string().trim().min(1).max(120),
  pages: z.record(z.string(), z.string().trim().min(1).max(1200)),
});

/** Saves the parent's text edits as a new version. Allowed until production starts, and again once complete. */
export async function saveStory(bookId: string, edits: { title: string; pages: Record<string, string> }): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const input = StoryEdits.safeParse(edits);
    if (!input.success) return fail("invalid_input");
    const book = await ownBook(bookId);
    if (!book) return fail("not_found");
    if (!["story_ready", "story_approved", "preview_ready", "completed"].includes(book.status)) return fail("wrong_state");
    const b = await loadBookBundle(bookId);
    const changed: Record<number, string> = {};
    for (const p of b.pages) {
      const next = input.data.pages[String(p.page_number)];
      if (next !== undefined && next !== p.text) changed[p.page_number] = next;
    }
    const titleChanged = input.data.title !== b.version?.title;
    if (!Object.keys(changed).length && !titleChanged) return ok(undefined);

    const safe = await textSafe([input.data.title, ...Object.values(changed)].join("\n"), user.id);
    if (!safe.ok) return safe;
    const versionId = await saveRevision(bookId, b, changed, "parent", user.id, input.data.title);

    // A finished book gets a fresh PDF with the new words (pictures are unchanged).
    if (book.status === "completed") {
      const admin = createAdminClient();
      const [{ data: v }, { data: row }] = await Promise.all([
        admin.from("book_versions").select("version_number").eq("id", versionId).single(),
        admin.from("books").select("image_regenerations_used").eq("id", bookId).single(),
      ]);
      await enqueueJob({ type: "pdf_render", ownerId: user.id, bookId, idempotencyKey: pdfJobKey(bookId, v?.version_number ?? 0, row?.image_regenerations_used ?? 0), priority: 8, maxAttempts: 5 });
    }
    revalidatePath(`/dashboard/books/${bookId}`);
    return ok(undefined);
  });
}

/** Asks the writer to rewrite one page, optionally following the parent's request. */
export async function rewritePage(bookId: string, pageNumber: number, instruction: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const book = await ownBook(bookId);
    if (!book) return fail("not_found");
    if (book.status !== "story_ready") return fail("wrong_state");
    const note = instruction.trim().slice(0, 500);
    const safe = await textSafe(note, user.id);
    if (!safe.ok) return safe;
    await assertWithinLimits(user.id, { kind: "page_rewrite" }, bookId);
    await enqueueJob({
      type: "story_rewrite_page", ownerId: user.id, bookId, payload: { page_number: pageNumber, instruction: note || null },
      idempotencyKey: `rewrite:${bookId}:${book.current_version_id}:p${pageNumber}`, priority: 4,
    });
    revalidatePath(`/dashboard/books/${bookId}`);
    return ok(undefined);
  });
}

/** Locks the story and draws the free preview pictures (front cover + first pages). */
export async function approveStory(bookId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const book = await ownBook(bookId);
    if (!book || !book.current_version_id) return fail("not_found");
    if (book.status !== "story_ready") return fail("wrong_state");
    const settings = await loadLimitSettings();
    const admin = createAdminClient();
    const { data: version } = await admin.from("book_versions").update({ approved_at: new Date().toISOString() }).eq("id", book.current_version_id).select("version_number").single();
    await admin.from("books").update({ status: "illustrating" }).eq("id", bookId);
    const v = version?.version_number ?? 1;
    await enqueueJob({ type: "cover_illustration", ownerId: user.id, bookId, payload: { kind: "front_cover", quality: "preview" }, idempotencyKey: `preview:${bookId}:v${v}:front_cover`, priority: 3 });
    for (let p = 1; p <= Math.min(settings.freeIllustrationPreviews, book.page_count); p++) {
      await enqueueJob({ type: "page_illustration", ownerId: user.id, bookId, payload: { page_number: p, quality: "preview" }, idempotencyKey: `preview:${bookId}:v${v}:p${p}`, priority: 3 });
    }
    revalidatePath(`/dashboard/books/${bookId}`);
    return ok(undefined);
  });
}

/** Redraws one picture: a preview before purchase, or a final page using the book's included redraws. */
export async function redrawIllustration(bookId: string, target: { kind: "page" | "front_cover" | "back_cover"; pageNumber?: number }): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const book = await ownBook(bookId);
    if (!book) return fail("not_found");
    const final = book.status === "completed";
    if (!final && book.status !== "preview_ready") return fail("wrong_state");
    await assertWithinLimits(user.id, { kind: final ? "illustration_regeneration" : "preview_illustration" }, bookId);
    const type = target.kind === "page" ? "page_illustration" : "cover_illustration";
    const payload = target.kind === "page"
      ? { page_number: target.pageNumber, quality: final ? "final" : "preview", regeneration: final }
      : { kind: target.kind, quality: final ? "final" : "preview", regeneration: final };
    await enqueueJob({ type, ownerId: user.id, bookId, payload, idempotencyKey: `redraw:${bookId}:${target.kind}:${target.pageNumber ?? 0}:${Date.now()}`, priority: 4 });
    revalidatePath(`/dashboard/books/${bookId}`);
    return ok(undefined);
  });
}

export async function toggleFavorite(bookId: string, favorite: boolean): Promise<ActionResult<undefined>> {
  return run(async () => {
    await requireUser();
    const db = await createClient();
    const { data } = await db.from("books").update({ is_favorite: favorite }).eq("id", bookId).select("id").maybeSingle();
    if (!data) return fail("not_found");
    revalidatePath("/dashboard", "layout");
    return ok(undefined);
  });
}

/** Deletes a book and its pictures/PDF. Order records are kept (anonymised link) for accounting. */
export async function deleteBook(bookId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const book = await ownBook(bookId);
    if (!book) return fail("not_found");
    if (book.status === "producing") return fail("wrong_state");
    const admin = createAdminClient();
    const [{ data: images }, { data: row }] = await Promise.all([
      admin.from("generated_illustrations").select("storage_path").eq("book_id", bookId).eq("owner_id", user.id),
      admin.from("books").select("pdf_path").eq("id", bookId).single(),
    ]);
    await removeObjects("illustrations", (images ?? []).map((i) => i.storage_path));
    if (row?.pdf_path) await removeObjects("book-pdfs", [row.pdf_path]);
    await admin.from("books").delete().eq("id", bookId);
    revalidatePath("/dashboard", "layout");
    return ok(undefined);
  });
}

/** Starts checkout and returns the gateway URL to redirect to. */
export async function checkoutBook(bookId: string, gateway: "stripe" | "paypal", discountCode: string): Promise<ActionResult<{ url: string }>> {
  return run(async () => {
    try {
      const { redirectUrl } = await startCheckout({ bookId, gateway, discountCode });
      return ok({ url: redirectUrl });
    } catch (e) {
      if (e instanceof CheckoutError) {
        const map = { not_found: "not_found", not_ready: "wrong_state", already_paid: "wrong_state", gateway_unavailable: "not_configured", product_unavailable: "not_configured", invalid_discount: "invalid_input", zero_total: "invalid_input" } as const;
        return fail(map[e.code]);
      }
      throw e;
    }
  });
}
