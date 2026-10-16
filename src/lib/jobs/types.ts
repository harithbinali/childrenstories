export type JobType =
  | "character_generate"
  | "scene_test"
  | "story_generate"
  | "story_rewrite_page"
  | "page_illustration"
  | "cover_illustration"
  | "book_production"
  | "pdf_render"
  | "purge_expired_photos"
  | "send_email";

export type JobRow = {
  id: string;
  owner_id: string | null;
  book_id: string | null;
  character_id: string | null;
  parent_job_id: string | null;
  type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export type JobContext = {
  job: JobRow;
  workerId: string;
  /** Extends the lease and records visible progress for the parent. */
  progress: (stage: string, percent: number) => Promise<void>;
};

/** Throw to fail without retrying (bad input, policy violation, missing data). */
export class PermanentJobError extends Error {}

export type JobHandler = (ctx: JobContext) => Promise<Record<string, unknown> | void>;
