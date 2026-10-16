import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStory, rewritePageText } from "@/lib/ai/story";
import { moderate } from "@/lib/ai/moderation";
import { loadBookBundle } from "@/lib/book/load";
import { PermanentJobError, type JobHandler } from "../types";

export const storyGenerate: JobHandler = async ({ job, progress }) => {
  if (!job.book_id || !job.owner_id) throw new PermanentJobError("story job without book/owner");
  const db = createAdminClient();
  const b = await loadBookBundle(job.book_id);
  if (b.book.owner_id !== job.owner_id) throw new PermanentJobError("owner mismatch");
  if (!b.child || !b.character || b.character.status !== "approved") throw new PermanentJobError("book needs a child and an approved character");
  if (!b.theme) throw new PermanentJobError("book has no theme");

  await progress("writing_story", 15);
  const ctx = { userId: job.owner_id, bookId: job.book_id, jobId: job.id };
  const { story, costUsd } = await generateStory(
    {
      childName: b.child.display_name,
      ageRange: b.book.age_range,
      interests: b.child.interests,
      language: b.book.language,
      pageCount: b.book.page_count,
      orientation: b.book.orientation,
      theme: { name: b.theme.name_en, guidance: b.theme.prompt_guidance, isCustom: b.theme.is_custom },
      customIdea: b.book.custom_idea,
      lesson: b.book.lesson,
      characterDescription: b.character.visual_description ?? "a friendly child",
    },
    ctx,
  );

  await progress("safety_check", 75);
  const verdict = await moderate({ text: [story.title, ...story.pages.map((p) => p.text)].join("\n") }, ctx);
  if (verdict.flagged) throw new Error(`generated story flagged by moderation (${verdict.categories.join(", ")}); retrying`);

  await progress("saving", 90);
  const { data: last } = await db.from("book_versions").select("version_number").eq("book_id", job.book_id).order("version_number", { ascending: false }).limit(1);
  const versionNumber = (last?.[0]?.version_number ?? 0) + 1;
  const { data: version, error: vErr } = await db
    .from("book_versions")
    .insert({
      book_id: job.book_id,
      version_number: versionNumber,
      title: story.title,
      outline: { beats: story.outline, wardrobe: story.wardrobe },
      cover_concept: story.cover_concept,
      source: "ai",
    })
    .select("id")
    .single();
  if (vErr || !version) throw new Error(`could not save version: ${vErr?.message}`);

  const { error: pErr } = await db.from("book_pages").insert(
    story.pages.map((p) => ({
      book_id: job.book_id,
      version_id: version.id,
      page_number: p.page_number,
      text: p.text,
      scene_description: p.scene_description,
      illustration_prompt: p.illustration_prompt,
      text_position: p.text_position,
    })),
  );
  if (pErr) throw new Error(`could not save pages: ${pErr.message}`);

  await db.from("books").update({ current_version_id: version.id, title: story.title, status: "story_ready" }).eq("id", job.book_id);
  await db.rpc("add_book_cost", { p_book_id: job.book_id, p_amount: costUsd ?? 0 });
  return { version_id: version.id, version_number: versionNumber };
};

/** Copies the current version with one page's text rewritten by the model. */
export const storyRewritePage: JobHandler = async ({ job, progress }) => {
  if (!job.book_id || !job.owner_id) throw new PermanentJobError("rewrite job without book/owner");
  const pageNumber = Number(job.payload.page_number);
  const b = await loadBookBundle(job.book_id);
  if (!b.version || !b.pages.some((p) => p.page_number === pageNumber)) throw new PermanentJobError("page not found");
  if (["producing", "completed"].includes(b.book.status)) throw new PermanentJobError("book is already in production");

  await progress("rewriting", 20);
  const ctx = { userId: job.owner_id, bookId: job.book_id, jobId: job.id };
  const text = await rewritePageText(
    {
      language: b.book.language,
      ageRange: b.book.age_range,
      orientation: b.book.orientation,
      title: b.version.title,
      pages: b.pages,
      pageNumber,
      instruction: (job.payload.instruction as string | undefined) ?? null,
    },
    ctx,
  );
  const verdict = await moderate({ text }, ctx);
  if (verdict.flagged) throw new Error("rewritten text flagged by moderation; retrying");

  const versionId = await saveRevision(job.book_id, b, { [pageNumber]: text }, "ai_rewrite", null);
  await createAdminClient().rpc("increment_book_counter", { p_book_id: job.book_id, p_counter: "text" });
  return { version_id: versionId };
};

/**
 * Writes a new book version = current version with `edits` applied. Page
 * illustrations carry over (they depend on the scene, not the wording).
 */
export async function saveRevision(
  bookId: string,
  b: Awaited<ReturnType<typeof loadBookBundle>>,
  edits: Record<number, string>,
  source: "parent" | "ai_rewrite",
  editorId: string | null,
  title?: string,
): Promise<string> {
  const db = createAdminClient();
  if (!b.version) throw new PermanentJobError("book has no story yet");
  const { data: last } = await db.from("book_versions").select("version_number").eq("book_id", bookId).order("version_number", { ascending: false }).limit(1);
  const { data: v, error } = await db
    .from("book_versions")
    .insert({
      book_id: bookId,
      version_number: (last?.[0]?.version_number ?? 0) + 1,
      title: title ?? b.version.title,
      outline: b.version.outline,
      cover_concept: b.version.cover_concept,
      source: source === "parent" ? "parent" : "ai_rewrite",
      created_by: editorId,
    })
    .select("id")
    .single();
  if (error || !v) throw new Error(`could not save revision: ${error?.message}`);

  const { data: oldPages } = await db.from("book_pages").select("page_number, illustration_id").eq("version_id", b.version.id);
  const illustrationByPage = new Map((oldPages ?? []).map((p) => [p.page_number, p.illustration_id]));
  const { error: pErr } = await db.from("book_pages").insert(
    b.pages.map((p) => ({
      book_id: bookId,
      version_id: v.id,
      page_number: p.page_number,
      text: edits[p.page_number] ?? p.text,
      scene_description: p.scene_description,
      illustration_prompt: p.illustration_prompt,
      text_position: p.text_position,
      illustration_id: illustrationByPage.get(p.page_number) ?? null,
    })),
  );
  if (pErr) throw new Error(`could not save revision pages: ${pErr.message}`);
  await db.from("books").update({ current_version_id: v.id, ...(title ? { title } : {}) }).eq("id", bookId);
  return v.id;
}
