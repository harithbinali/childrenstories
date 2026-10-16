import { describe, expect, it } from "vitest";
import { evaluateLimits, type LimitSettings, type UsageSnapshot } from "./policy";

const s: LimitSettings = {
  freeCharacterAttempts: 3, freeStoryAttempts: 3, freeIllustrationPreviews: 2,
  dailyImageGenerationsPerUser: 30, dailyTextGenerationsPerUser: 40, maxConcurrentJobsPerUser: 4, dailyPlatformSpendUsd: 100,
};
const book = { entitled: false, storyGenerations: 0, previewIllustrations: 0, textRegenerationsUsed: 0, imageRegenerationsUsed: 0, includedRegenerations: 8 };
const u = (o: Partial<UsageSnapshot> = {}): UsageSnapshot => ({
  hasPaidOrder: false, characterGenerationsTotal: 0, imageJobsLast24h: 0, textJobsLast24h: 0, activeJobs: 0, platformSpendLast24hUsd: 0, book, ...o,
});

describe("evaluateLimits", () => {
  it("allows free character attempts, then requires purchase history", () => {
    expect(evaluateLimits(s, u({ characterGenerationsTotal: 2 }), { kind: "character" })).toEqual({ allowed: true });
    expect(evaluateLimits(s, u({ characterGenerationsTotal: 3 }), { kind: "character" })).toEqual({ allowed: false, code: "free_character_attempts_used" });
    expect(evaluateLimits(s, u({ characterGenerationsTotal: 3, hasPaidOrder: true }), { kind: "character" })).toEqual({ allowed: true });
  });
  it("caps story attempts on unpaid books", () => {
    expect(evaluateLimits(s, u({ book: { ...book, storyGenerations: 3 } }), { kind: "story" })).toEqual({ allowed: false, code: "free_story_attempts_used" });
    expect(evaluateLimits(s, u({ book: { ...book, storyGenerations: 3, entitled: true } }), { kind: "story" })).toEqual({ allowed: true });
  });
  it("caps unpaid preview illustrations", () => {
    expect(evaluateLimits(s, u({ book: { ...book, previewIllustrations: 2 } }), { kind: "preview_illustration" })).toEqual({ allowed: false, code: "free_previews_used" });
  });
  it("only entitled books may regenerate illustrations, within the included allowance", () => {
    expect(evaluateLimits(s, u(), { kind: "illustration_regeneration" })).toEqual({ allowed: false, code: "purchase_required" });
    expect(evaluateLimits(s, u({ book: { ...book, entitled: true, imageRegenerationsUsed: 7 } }), { kind: "illustration_regeneration" })).toEqual({ allowed: true });
    expect(evaluateLimits(s, u({ book: { ...book, entitled: true, imageRegenerationsUsed: 8 } }), { kind: "illustration_regeneration" })).toEqual({ allowed: false, code: "regenerations_used" });
  });
  it("enforces daily, concurrency and platform-spend caps", () => {
    expect(evaluateLimits(s, u({ imageJobsLast24h: 30 }), { kind: "character" })).toEqual({ allowed: false, code: "daily_image_limit" });
    expect(evaluateLimits(s, u({ textJobsLast24h: 40 }), { kind: "story" })).toEqual({ allowed: false, code: "daily_text_limit" });
    expect(evaluateLimits(s, u({ activeJobs: 4 }), { kind: "story" })).toEqual({ allowed: false, code: "too_many_active_jobs" });
    expect(evaluateLimits(s, u({ platformSpendLast24hUsd: 100 }), { kind: "story" })).toEqual({ allowed: false, code: "platform_paused" });
  });
  it("lets a new book start unless a shared cap is hit", () => {
    expect(evaluateLimits(s, u({ book: undefined }), { kind: "new_book" })).toEqual({ allowed: true });
    expect(evaluateLimits(s, u({ book: undefined, textJobsLast24h: 40 }), { kind: "new_book" })).toEqual({ allowed: false, code: "daily_text_limit" });
  });
  it("never blocks fulfilment of a paid book, even when spend caps are hit", () => {
    expect(evaluateLimits(s, u({ platformSpendLast24hUsd: 9999, activeJobs: 99, book: { ...book, entitled: true } }), { kind: "paid_production" })).toEqual({ allowed: true });
    expect(evaluateLimits(s, u(), { kind: "paid_production" })).toEqual({ allowed: false, code: "purchase_required" });
  });
});
