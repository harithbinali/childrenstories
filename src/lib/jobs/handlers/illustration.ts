import "@/lib/server-guard";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSceneIllustration, type InputImage } from "@/lib/ai/images";
import { loadBookBundle, type BookBundle } from "@/lib/book/load";
import { getObject, paths, putObject } from "@/lib/storage";
import { enqueueJob } from "../enqueue";
import { PermanentJobError, type JobHandler } from "../types";

type Kind = "page" | "front_cover" | "back_cover";
type Tier = "preview" | "final";

async function currentIllustration(bookId: string, kind: Kind, pageNumber: number | null, tier: Tier) {
  let q = createAdminClient().from("generated_illustrations").select("id, storage_path").eq("book_id", bookId).eq("kind", kind).eq("quality_tier", tier).eq("is_current", true);
  q = pageNumber === null ? q.is("page_number", null) : q.eq("page_number", pageNumber);
  const { data } = await q.maybeSingle();
  return data;
}

async function illustrate(job: Parameters<JobHandler>[0]["job"], progress: Parameters<JobHandler>[0]["progress"], kind: Kind) {
  if (!job.book_id || !job.owner_id) throw new PermanentJobError("illustration job without book/owner");
  const tier = (job.payload.quality as Tier) ?? "preview";
  const pageNumber = kind === "page" ? Number(job.payload.page_number) : null;
  const regeneration = Boolean(job.payload.regeneration);
  const db = createAdminClient();

  const b = await loadBookBundle(job.book_id);
  if (b.book.owner_id !== job.owner_id) throw new PermanentJobError("owner mismatch");
  if (!b.reference || !b.character || !b.style || !b.version) throw new PermanentJobError("book is missing an approved character, style or story");
  const page = kind === "page" ? b.pages.find((p) => p.page_number === pageNumber) : null;
  if (kind === "page" && !page) throw new PermanentJobError(`page ${pageNumber} not found`);

  await progress("loading_character", 10);
  const reference: InputImage = { bytes: await getObject("character-refs", b.reference.storage_path), mimeType: "image/png", name: "character.png" };

  // A final render keeps the composition of the approved preview, if any.
  let compositionReference: InputImage | null = null;
  if (tier === "final" && !regeneration) {
    const preview = await currentIllustration(job.book_id, kind, pageNumber, "preview");
    if (preview) compositionReference = { bytes: await getObject("illustrations", preview.storage_path), mimeType: "image/png", name: "draft.png" };
  }

  const scenePrompt =
    kind === "page"
      ? `${page!.illustration_prompt}\n(Story moment: ${page!.scene_description})`
      : kind === "front_cover"
        ? b.version.cover_concept ?? `The hero smiling in the world of "${b.version.title}".`
        : `A warm goodbye vignette: the hero waving happily, small and centred, in the world of "${b.version.title}".`;

  await progress("illustrating", 25);
  const gen = await generateSceneIllustration(
    {
      reference,
      characterDescription: b.character.visual_description ?? "",
      wardrobe: b.version.outline.wardrobe ?? "the same outfit on every page",
      stylePrompt: b.style.prompt_template,
      scenePrompt,
      orientation: b.book.orientation,
      textPosition: page?.text_position ?? null,
      language: b.book.language,
      quality: tier,
      kind,
      compositionReference,
    },
    { userId: job.owner_id, bookId: job.book_id, jobId: job.id },
  );

  await progress("saving", 85);
  const id = randomUUID();
  const storagePath = paths.illustration(job.owner_id, job.book_id, id);
  await putObject("illustrations", storagePath, gen.image, "image/png");
  const [w, h] = gen.size.split("x").map(Number);

  // Retire the previous current image for this slot, then insert the new one.
  let retire = db.from("generated_illustrations").update({ is_current: false }).eq("book_id", job.book_id).eq("kind", kind).eq("quality_tier", tier).eq("is_current", true);
  retire = pageNumber === null ? retire.is("page_number", null) : retire.eq("page_number", pageNumber);
  await retire;
  const { error } = await db.from("generated_illustrations").insert({
    id, book_id: job.book_id, owner_id: job.owner_id, page_number: pageNumber, kind, quality_tier: tier,
    storage_path: storagePath, width: w, height: h, model: gen.model, prompt: gen.prompt, generation_job_id: job.id,
  });
  if (error) throw new Error(`could not save illustration: ${error.message}`);

  if (page && (tier === "final" || !(await currentIllustration(job.book_id, "page", pageNumber, "final")))) {
    await db.from("book_pages").update({ illustration_id: id }).eq("id", page.id);
  }
  await db.rpc("add_book_cost", { p_book_id: job.book_id, p_amount: gen.costUsd ?? 0 });
  if (regeneration) await db.rpc("increment_book_counter", { p_book_id: job.book_id, p_counter: "image" });

  if (tier === "preview") await markPreviewReadyIfDone(b);
  if (tier === "final") await enqueuePdfIfIllustrated(job.book_id, job.owner_id, b);
  return { illustration_id: id, cost_usd: gen.costUsd };
}

export const pageIllustration: JobHandler = ({ job, progress }) => illustrate(job, progress, "page");
export const coverIllustration: JobHandler = ({ job, progress }) =>
  illustrate(job, progress, (job.payload.kind as Kind) === "back_cover" ? "back_cover" : "front_cover");

async function markPreviewReadyIfDone(b: BookBundle) {
  const db = createAdminClient();
  // The current job is still "processing", so "only me left" means count <= 1.
  const { count } = await db
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("book_id", b.book.id)
    .in("type", ["page_illustration", "cover_illustration"])
    .in("status", ["queued", "processing"]);
  if ((count ?? 0) <= 1 && b.book.status === "illustrating") {
    await db.from("books").update({ status: "preview_ready" }).eq("id", b.book.id).eq("status", "illustrating");
  }
}

/** Fan-in: once every final page + both covers exist, render the PDF once. */
export async function enqueuePdfIfIllustrated(bookId: string, ownerId: string, b?: BookBundle) {
  const db = createAdminClient();
  const bundle = b ?? (await loadBookBundle(bookId));
  const { data } = await db.from("generated_illustrations").select("kind, page_number").eq("book_id", bookId).eq("quality_tier", "final").eq("is_current", true);
  const have = new Set((data ?? []).map((r) => (r.kind === "page" ? `p${r.page_number}` : r.kind)));
  const needed = ["front_cover", "back_cover", ...bundle.pages.map((p) => `p${p.page_number}`)];
  if (!needed.every((k) => have.has(k)) || !bundle.version) return false;
  await enqueueJob({
    type: "pdf_render",
    ownerId,
    bookId,
    idempotencyKey: `pdf:${bookId}:v${bundle.version.version_number}`,
    priority: 10,
    maxAttempts: 5,
  });
  return true;
}
