/**
 * Generation limits (Part 18). Pure decision logic; the snapshot is loaded
 * from the database by limits/check.ts. All limits are admin-configurable.
 */

export type LimitSettings = {
  freeCharacterAttempts: number;
  freeStoryAttempts: number;
  freeIllustrationPreviews: number;
  dailyImageGenerationsPerUser: number;
  dailyTextGenerationsPerUser: number;
  maxConcurrentJobsPerUser: number;
  dailyPlatformSpendUsd: number;
};

export type UsageSnapshot = {
  hasPaidOrder: boolean;
  characterGenerationsTotal: number;
  imageJobsLast24h: number;
  textJobsLast24h: number;
  activeJobs: number;
  platformSpendLast24hUsd: number;
  book?: {
    entitled: boolean;
    storyGenerations: number;
    previewIllustrations: number;
    textRegenerationsUsed: number;
    imageRegenerationsUsed: number;
    includedRegenerations: number;
  };
};

export type GenerationRequest =
  | { kind: "character" }
  | { kind: "new_book" }
  | { kind: "story" }
  | { kind: "page_rewrite" }
  | { kind: "preview_illustration" }
  | { kind: "illustration_regeneration" }
  | { kind: "paid_production" };

export type LimitCode =
  | "free_character_attempts_used"
  | "free_story_attempts_used"
  | "free_previews_used"
  | "regenerations_used"
  | "daily_image_limit"
  | "daily_text_limit"
  | "too_many_active_jobs"
  | "platform_paused"
  | "purchase_required";

export type LimitDecision = { allowed: true } | { allowed: false; code: LimitCode };

const deny = (code: LimitCode): LimitDecision => ({ allowed: false, code });
const IMAGE_KINDS = new Set<GenerationRequest["kind"]>(["character", "preview_illustration", "illustration_regeneration"]);

export function evaluateLimits(s: LimitSettings, u: UsageSnapshot, r: GenerationRequest): LimitDecision {
  // Paid books are always fulfilled — spend caps never block what a parent bought.
  if (r.kind === "paid_production") return u.book?.entitled ? { allowed: true } : deny("purchase_required");

  if (u.platformSpendLast24hUsd >= s.dailyPlatformSpendUsd) return deny("platform_paused");
  if (u.activeJobs >= s.maxConcurrentJobsPerUser) return deny("too_many_active_jobs");
  if (IMAGE_KINDS.has(r.kind) && u.imageJobsLast24h >= s.dailyImageGenerationsPerUser) return deny("daily_image_limit");
  if (!IMAGE_KINDS.has(r.kind) && u.textJobsLast24h >= s.dailyTextGenerationsPerUser) return deny("daily_text_limit");

  switch (r.kind) {
    case "new_book":
      return { allowed: true }; // only the shared daily / concurrency / spend caps apply
    case "character":
      return u.hasPaidOrder || u.characterGenerationsTotal < s.freeCharacterAttempts ? { allowed: true } : deny("free_character_attempts_used");
    case "story":
      if (!u.book) throw new Error("book usage required");
      return u.book.entitled || u.book.storyGenerations < s.freeStoryAttempts ? { allowed: true } : deny("free_story_attempts_used");
    case "page_rewrite":
      if (!u.book) throw new Error("book usage required");
      return u.book.textRegenerationsUsed < u.book.includedRegenerations ? { allowed: true } : deny("regenerations_used");
    case "preview_illustration":
      if (!u.book) throw new Error("book usage required");
      return u.book.previewIllustrations < s.freeIllustrationPreviews ? { allowed: true } : deny("free_previews_used");
    case "illustration_regeneration":
      if (!u.book) throw new Error("book usage required");
      if (!u.book.entitled) return deny("purchase_required");
      return u.book.imageRegenerationsUsed < u.book.includedRegenerations ? { allowed: true } : deny("regenerations_used");
  }
}
