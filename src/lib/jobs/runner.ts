import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai/errors";
import { LimitError } from "@/lib/limits/check";
import { handlers } from "./handlers";
import { PermanentJobError, type JobRow } from "./types";

const LEASE_SECONDS = 300;

function isRetryable(e: unknown): boolean {
  if (e instanceof PermanentJobError || e instanceof LimitError) return false;
  if (e instanceof AiError) return e.retryable;
  return true; // unknown/infra errors (network, storage) are worth a retry
}

export async function runJob(job: JobRow, workerId: string): Promise<"completed" | "queued" | "failed"> {
  const db = createAdminClient();
  const handler = handlers[job.type];
  const heartbeat = setInterval(() => {
    void db.rpc("heartbeat_generation_job", { p_job_id: job.id, p_worker: workerId, p_lease_seconds: LEASE_SECONDS });
  }, 60_000);
  try {
    if (!handler) throw new PermanentJobError(`no handler for job type ${job.type}`);
    const result = await handler({
      job,
      workerId,
      progress: async (stage, percent) => {
        await db.rpc("heartbeat_generation_job", {
          p_job_id: job.id, p_worker: workerId, p_lease_seconds: LEASE_SECONDS,
          p_stage: stage, p_progress: Math.max(0, Math.min(100, Math.round(percent))),
        });
      },
    });
    const { data, error } = await db.rpc("complete_generation_job", { p_job_id: job.id, p_worker: workerId, p_result: result ?? null });
    if (error) throw new Error(`could not complete job: ${error.message}`);
    if (!data) console.warn(`[jobs] ${job.id} lease was lost before completion`);
    return "completed";
  } catch (e) {
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[jobs] ${job.type} ${job.id} attempt ${job.attempts} failed: ${message}`);
    const { data } = await db.rpc("fail_generation_job", {
      p_job_id: job.id, p_worker: workerId, p_error: message, p_retryable: isRetryable(e),
    });
    if (data === "failed") await onJobFailedPermanently(job, message);
    return (data as "queued" | "failed") ?? "failed";
  } finally {
    clearInterval(heartbeat);
  }
}

/** Surface permanent failures on the owning entity so the parent UI can offer a retry. */
async function onJobFailedPermanently(job: JobRow, message: string) {
  const db = createAdminClient();
  if (job.type === "character_generate" && job.character_id) {
    await db.from("characters").update({ status: "failed" }).eq("id", job.character_id).eq("status", "generating");
  }
  if (job.type === "story_generate" && job.book_id) {
    await db.from("books").update({ status: "failed" }).eq("id", job.book_id).eq("status", "story_generating");
  }
  console.error(`[jobs] permanently failed ${job.type} ${job.id}: ${message}`);
}

/**
 * Claims and runs up to `limit` jobs concurrently, stopping claims once the
 * deadline passes. Used by the long-running worker and the Vercel Cron route.
 */
export async function processBatch(workerId: string, limit: number, opts: { types?: string[] } = {}) {
  const { data, error } = await createAdminClient().rpc("claim_generation_jobs", {
    p_worker: workerId, p_limit: limit, p_lease_seconds: LEASE_SECONDS, p_types: opts.types ?? null,
  });
  if (error) throw new Error(`claim failed: ${error.message}`);
  const jobs = (data ?? []) as JobRow[];
  const results = await Promise.all(jobs.map((j) => runJob(j, workerId)));
  return { claimed: jobs.length, results };
}
