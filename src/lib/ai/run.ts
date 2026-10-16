import "@/lib/server-guard";
import { createHash } from "node:crypto";
import type OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { openai } from "./client";
import { estimateCostUsd, type Usage } from "./cost";
import { AiError, backoffMs, classifyAiError } from "./errors";
import { getAiSetting, type AiModelSetting, type AiPurpose } from "./settings";

export type AiContext = {
  userId?: string | null;
  bookId?: string | null;
  characterId?: string | null;
  jobId?: string | null;
};

type CallResult<T> = { result: T; usage: Usage; requestId?: string | null };

/**
 * Every OpenAI call goes through here:
 *  - model + timeout + retry policy come from admin settings
 *  - transient failures retry with backoff; permanent ones fail fast
 *  - every attempt (success or failure) is written to ai_usage_logs with an
 *    estimated cost, so the admin dashboard can report spend per user/book
 */
export async function runAI<T>(
  purpose: AiPurpose,
  operation: string,
  ctx: AiContext,
  call: (client: OpenAI, setting: AiModelSetting, opts: { signal: AbortSignal; safetyId: string | undefined }) => Promise<CallResult<T>>,
): Promise<{ result: T; costUsd: number | null }> {
  const setting = await getAiSetting(purpose);
  const safetyId = ctx.userId ? createHash("sha256").update(`storyling:${ctx.userId}`).digest("hex").slice(0, 32) : undefined;
  let lastError: AiError | null = null;

  for (let attempt = 0; attempt <= setting.max_retries; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), setting.timeout_ms);
    try {
      const { result, usage, requestId } = await call(openai(), setting, { signal: controller.signal, safetyId });
      const costUsd = estimateCostUsd(setting.pricing, usage);
      await logUsage({ purpose, operation, ctx, setting, usage, costUsd, latencyMs: Date.now() - started, success: true, requestId });
      return { result, costUsd };
    } catch (e) {
      lastError = classifyAiError(e);
      await logUsage({
        purpose, operation, ctx, setting, usage: {}, costUsd: null, latencyMs: Date.now() - started,
        success: false, errorCode: lastError.kind, requestId: lastError.requestId,
      });
      if (!lastError.retryable || attempt === setting.max_retries) break;
      await new Promise((r) => setTimeout(r, backoffMs(attempt, lastError!.retryAfterMs)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new AiError("AI call failed", "unknown", false);
}

async function logUsage(p: {
  purpose: AiPurpose;
  operation: string;
  ctx: AiContext;
  setting: AiModelSetting;
  usage: Usage;
  costUsd: number | null;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  requestId?: string | null;
}) {
  const { error } = await createAdminClient().from("ai_usage_logs").insert({
    user_id: p.ctx.userId ?? null,
    book_id: p.ctx.bookId ?? null,
    character_id: p.ctx.characterId ?? null,
    job_id: p.ctx.jobId ?? null,
    purpose: p.purpose,
    operation: p.operation,
    model: p.setting.model,
    input_tokens: (p.usage.inputTokens ?? 0) + (p.usage.imageInputTokens ?? 0),
    output_tokens: (p.usage.outputTokens ?? 0) + (p.usage.imageOutputTokens ?? 0),
    image_count: p.usage.imageCount ?? 0,
    image_size: p.usage.imageSize ?? null,
    image_quality: p.usage.imageQuality ?? null,
    estimated_cost_usd: p.costUsd,
    latency_ms: p.latencyMs,
    success: p.success,
    error_code: p.errorCode ?? null,
    request_id: p.requestId ?? null,
  });
  // Accounting must not break generation, but it must be visible.
  if (error) console.error("[ai] usage log failed", error.message);
}
