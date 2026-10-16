import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { evaluateLimits, type GenerationRequest, type LimitCode, type LimitSettings, type UsageSnapshot } from "./policy";

export class LimitError extends Error {
  constructor(public readonly code: LimitCode) {
    super(`generation limit reached: ${code}`);
  }
}

const IMAGE_JOB_TYPES = ["character_generate", "scene_test", "page_illustration", "cover_illustration"];
const TEXT_JOB_TYPES = ["story_generate", "story_rewrite_page"];

export async function loadLimitSettings(): Promise<LimitSettings> {
  const s = await getSettings({
    "limits.free_character_attempts": 3,
    "limits.free_story_attempts": 3,
    "limits.free_illustration_previews": 2,
    "limits.daily_image_generations_per_user": 30,
    "limits.daily_text_generations_per_user": 40,
    "limits.max_concurrent_jobs_per_user": 4,
    "limits.daily_platform_spend_usd": 100,
  });
  return {
    freeCharacterAttempts: Number(s["limits.free_character_attempts"]),
    freeStoryAttempts: Number(s["limits.free_story_attempts"]),
    freeIllustrationPreviews: Number(s["limits.free_illustration_previews"]),
    dailyImageGenerationsPerUser: Number(s["limits.daily_image_generations_per_user"]),
    dailyTextGenerationsPerUser: Number(s["limits.daily_text_generations_per_user"]),
    maxConcurrentJobsPerUser: Number(s["limits.max_concurrent_jobs_per_user"]),
    dailyPlatformSpendUsd: Number(s["limits.daily_platform_spend_usd"]),
  };
}

export async function loadUsage(userId: string, bookId?: string): Promise<UsageSnapshot> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: n, error } = await q;
    if (error) throw new Error(error.message);
    return n ?? 0;
  };

  const [paid, characters, images, texts, active, spend] = await Promise.all([
    count(db.from("orders").select("id", { count: "exact", head: true }).eq("owner_id", userId).in("status", ["paid", "partially_refunded"])),
    count(db.from("generation_jobs").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("type", "character_generate")),
    count(db.from("generation_jobs").select("id", { count: "exact", head: true }).eq("owner_id", userId).in("type", IMAGE_JOB_TYPES).gte("created_at", since)),
    count(db.from("generation_jobs").select("id", { count: "exact", head: true }).eq("owner_id", userId).in("type", TEXT_JOB_TYPES).gte("created_at", since)),
    count(db.from("generation_jobs").select("id", { count: "exact", head: true }).eq("owner_id", userId).in("status", ["queued", "processing"])),
    db.from("ai_usage_logs").select("estimated_cost_usd").gte("created_at", since).not("estimated_cost_usd", "is", null),
  ]);
  if (spend.error) throw new Error(spend.error.message);
  const platformSpend = (spend.data ?? []).reduce((a, r) => a + Number(r.estimated_cost_usd), 0);

  const snapshot: UsageSnapshot = {
    hasPaidOrder: paid > 0,
    characterGenerationsTotal: characters,
    imageJobsLast24h: images,
    textJobsLast24h: texts,
    activeJobs: active,
    platformSpendLast24hUsd: platformSpend,
  };

  if (bookId) {
    const { data: book, error } = await db
      .from("books")
      .select("id, owner_id, text_regenerations_used, image_regenerations_used, page_count, book_products(included_regenerations)")
      .eq("id", bookId)
      .single();
    if (error || !book || book.owner_id !== userId) throw new Error("book not found");
    const [stories, previews, entitled] = await Promise.all([
      count(db.from("generation_jobs").select("id", { count: "exact", head: true }).eq("book_id", bookId).eq("type", "story_generate")),
      count(db.from("generated_illustrations").select("id", { count: "exact", head: true }).eq("book_id", bookId).eq("quality_tier", "preview").eq("kind", "page")),
      db.rpc("has_book_entitlement", { p_book_id: bookId, p_user: userId }),
    ]);
    const product = book.book_products as unknown as { included_regenerations: number } | null;
    snapshot.book = {
      entitled: entitled.data === true,
      storyGenerations: stories,
      previewIllustrations: previews,
      textRegenerationsUsed: book.text_regenerations_used,
      imageRegenerationsUsed: book.image_regenerations_used,
      includedRegenerations: product?.included_regenerations ?? book.page_count,
    };
  }
  return snapshot;
}

/** Server-side enforcement point used before every enqueue. */
export async function assertWithinLimits(userId: string, request: GenerationRequest, bookId?: string): Promise<void> {
  const [settings, usage] = await Promise.all([loadLimitSettings(), loadUsage(userId, bookId)]);
  const decision = evaluateLimits(settings, usage, request);
  if (!decision.allowed) throw new LimitError(decision.code);
}
