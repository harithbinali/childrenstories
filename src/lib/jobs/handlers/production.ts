import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookBundle } from "@/lib/book/load";
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

