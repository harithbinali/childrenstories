import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JobType } from "./types";

export type EnqueueArgs = {
  type: JobType;
  ownerId: string | null;
  payload?: Record<string, unknown>;
  bookId?: string | null;
  characterId?: string | null;
  parentJobId?: string | null;
  idempotencyKey?: string | null;
  priority?: number;
  maxAttempts?: number;
  runAfter?: Date;
};

/** Idempotent: the same idempotencyKey always returns the same job. */
export async function enqueueJob(a: EnqueueArgs): Promise<{ id: string; status: string }> {
  const { data, error } = await createAdminClient().rpc("enqueue_generation_job", {
    p_type: a.type,
    p_owner_id: a.ownerId,
    p_payload: a.payload ?? {},
    p_book_id: a.bookId ?? null,
    p_character_id: a.characterId ?? null,
    p_parent_job_id: a.parentJobId ?? null,
    p_idempotency_key: a.idempotencyKey ?? null,
    p_priority: a.priority ?? 0,
    p_max_attempts: a.maxAttempts ?? 3,
    p_run_after: (a.runAfter ?? new Date()).toISOString(),
  });
  if (error || !data) throw new Error(`enqueue failed: ${error?.message}`);
  return { id: data.id, status: data.status };
}
