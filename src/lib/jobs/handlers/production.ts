import "@/lib/server-guard";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookBundle } from "@/lib/book/load";
import { buildPageSequence } from "@/lib/book/layout-spec";
import { BOOK_FONT_FACES } from "@/lib/book/fonts";
import type { BookPageProps } from "@/components/book/BookPage";
import { buildBookHtml } from "@/lib/pdf/book-html";
import { renderPdf } from "@/lib/pdf/render";
import { getObject, paths } from "@/lib/storage";
import { enqueueJob } from "../enqueue";
import { enqueuePdfIfIllustrated } from "./illustration";
import { PermanentJobError, type JobHandler } from "../types";

/**
 * Runs after a verified payment (enqueued by mark_order_paid). Fans out one
 * final-quality job per page and cover; the last one to finish enqueues the
 * PDF render. Every child job has an idempotency key, so re-running this
 * (duplicate webhook, retry) never creates duplicate work.
 */
export const bookProduction: JobHandler = async ({ job, progress }) => {
  if (!job.book_id || !job.owner_id) throw new PermanentJobError("production job without book/owner");
  const db = createAdminClient();
  const { data: entitled } = await db.rpc("has_book_entitlement", { p_book_id: job.book_id, p_user: job.owner_id });
  if (!entitled) throw new PermanentJobError("no active entitlement for this book");

  const b = await loadBookBundle(job.book_id);
  if (!b.version || !b.pages.length) throw new PermanentJobError("book has no approved story");
  if (!b.reference) throw new PermanentJobError("book character has no approved reference");

  await db.from("book_versions").update({ approved_at: new Date().toISOString() }).eq("id", b.version.id).is("approved_at", null);
  await progress("scheduling_illustrations", 10);

  const v = b.version.version_number;
  const enqueues = [
    ...b.pages.map((p) =>
      enqueueJob({
        type: "page_illustration", ownerId: job.owner_id, bookId: job.book_id, parentJobId: job.id, priority: 5, maxAttempts: 4,
        payload: { page_number: p.page_number, quality: "final" },
        idempotencyKey: `final:${job.book_id}:v${v}:p${p.page_number}`,
      }),
    ),
    ...(["front_cover", "back_cover"] as const).map((kind) =>
      enqueueJob({
        type: "cover_illustration", ownerId: job.owner_id, bookId: job.book_id, parentJobId: job.id, priority: 6, maxAttempts: 4,
        payload: { kind, quality: "final" },
        idempotencyKey: `final:${job.book_id}:v${v}:${kind}`,
      }),
    ),
  ];
  await Promise.all(enqueues);
  // If every final image already exists (e.g. this job is a retry), go straight to PDF.
  await enqueuePdfIfIllustrated(job.book_id, job.owner_id, b);
  return { scheduled: enqueues.length };
};

export const pdfRender: JobHandler = async ({ job, progress }) => {
  if (!job.book_id || !job.owner_id) throw new PermanentJobError("pdf job without book/owner");
  const db = createAdminClient();
  const b = await loadBookBundle(job.book_id);
  if (!b.version) throw new PermanentJobError("book has no story");

  const { data: images } = await db
    .from("generated_illustrations")
    .select("kind, page_number, storage_path")
    .eq("book_id", job.book_id)
    .eq("quality_tier", "final")
    .eq("is_current", true);
  const byKey = new Map((images ?? []).map((i) => [i.kind === "page" ? `p${i.page_number}` : i.kind, i.storage_path]));

  await progress("collecting_artwork", 15);
  const dataUrl = async (path: string | undefined) => {
    if (!path) throw new Error(`missing final illustration ${path}`);
    return `data:image/png;base64,${Buffer.from(await getObject("illustrations", path)).toString("base64")}`;
  };

  const common = { orientation: b.book.orientation, language: b.book.language, ageRange: b.book.age_range } as const;
  const childName = b.child?.display_name ?? "";
  const sequence = buildPageSequence(b.book.page_count, Boolean(b.book.dedication));
  const pages: BookPageProps[] = [];
  for (const s of sequence) {
    if (s.kind === "front_cover") pages.push({ ...common, kind: s.kind, title: b.version.title, imageUrl: await dataUrl(byKey.get("front_cover")) });
    else if (s.kind === "back_cover") pages.push({ ...common, kind: s.kind, imageUrl: await dataUrl(byKey.get("back_cover")) });
    else if (s.kind === "dedication") pages.push({ ...common, kind: s.kind, text: b.book.dedication ?? "" });
    else {
      const page = b.pages.find((p) => p.page_number === s.storyPageNumber)!;
      pages.push({
        ...common, kind: "story", text: page.text, textPosition: page.text_position, pageNumber: page.page_number,
        imageUrl: await dataUrl(byKey.get(`p${page.page_number}`)), imageAlt: page.scene_description,
      });
    }
  }

  await progress("embedding_fonts", 40);
  const fonts = await Promise.all(
    BOOK_FONT_FACES.map(async (f) => ({
      family: f.family, weight: f.weight, style: f.style,
      dataUrl: `data:font/ttf;base64,${(await readFile(join(process.cwd(), "public", f.file))).toString("base64")}`,
    })),
  );

  await progress("rendering_pdf", 55);
  const pdf = await renderPdf(buildBookHtml({ orientation: b.book.orientation, language: b.book.language, title: b.version.title || childName, pages, fonts }), b.book.orientation);

  await progress("saving_pdf", 90);
  const path = paths.bookPdf(job.owner_id, job.book_id, b.version.version_number);
  await createAdminClient().storage.from("book-pdfs").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  const now = new Date().toISOString();
  await db.from("books").update({ pdf_path: path, pdf_generated_at: now, status: "completed", completed_at: now }).eq("id", job.book_id);

  await enqueueJob({
    type: "send_email", ownerId: job.owner_id, bookId: job.book_id,
    payload: { template: "book_ready", book_id: job.book_id },
    idempotencyKey: `email:book_ready:${job.book_id}:v${b.version.version_number}`,
  });
  return { pdf_path: path, bytes: pdf.length };
};

/** Retention: delete original child photos past their delete_after date. */
export const purgeExpiredPhotos: JobHandler = async () => {
  const db = createAdminClient();
  const { data } = await db.from("child_photos").select("id, storage_path").lte("delete_after", new Date().toISOString()).limit(500);
  if (!data?.length) return { deleted: 0 };
  const { error } = await db.storage.from("child-photos").remove(data.map((p) => p.storage_path));
  if (error) throw new Error(`photo purge failed: ${error.message}`);
  await db.from("child_photos").delete().in("id", data.map((p) => p.id));
  return { deleted: data.length };
};

