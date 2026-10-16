import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pricing } from "./cost";

export type AiPurpose = "story" | "story_fast" | "image" | "moderation";

export type AiModelSetting = {
  purpose: AiPurpose;
  model: string;
  params: Record<string, unknown>;
  timeout_ms: number;
  max_retries: number;
  pricing: Pricing;
};

let cache: { at: number; rows: Map<AiPurpose, AiModelSetting> } | null = null;
const TTL_MS = 30_000;

/** Admin-configured model settings, cached briefly so admin edits apply within ~30s. */
export async function getAiSetting(purpose: AiPurpose): Promise<AiModelSetting> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const { data, error } = await createAdminClient().from("ai_model_settings").select("purpose, model, params, timeout_ms, max_retries, pricing");
    if (error) throw new Error(`could not load AI settings: ${error.message}`);
    cache = { at: Date.now(), rows: new Map((data ?? []).map((r) => [r.purpose as AiPurpose, r as AiModelSetting])) };
  }
  const row = cache.rows.get(purpose);
  if (!row) throw new Error(`AI model for "${purpose}" is not configured (Admin > AI Configuration)`);
  return row;
}

export function invalidateAiSettingsCache() {
  cache = null;
}
