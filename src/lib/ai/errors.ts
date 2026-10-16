import { APIConnectionError, APIConnectionTimeoutError, APIError } from "openai";

export type AiErrorKind = "rate_limited" | "server" | "timeout" | "network" | "content_policy" | "bad_request" | "auth" | "unknown";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: AiErrorKind,
    public readonly retryable: boolean,
    public readonly retryAfterMs: number | null = null,
    public readonly requestId: string | null = null,
  ) {
    super(message);
  }
}

export function classifyAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof APIConnectionTimeoutError) return new AiError("OpenAI request timed out", "timeout", true);
  if (e instanceof APIConnectionError) return new AiError("Could not reach OpenAI", "network", true);
  if (e instanceof APIError) {
    const requestId = e.requestID ?? null;
    const retryAfter = Number(e.headers?.get?.("retry-after"));
    const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null;
    const code = (e.error as { code?: string } | undefined)?.code ?? e.code ?? "";
    if (e.status === 429) {
      // insufficient_quota is a billing problem, not a transient limit
      return new AiError(e.message, "rate_limited", code !== "insufficient_quota", retryAfterMs, requestId);
    }
    if (e.status === 401 || e.status === 403) return new AiError(e.message, "auth", false, null, requestId);
    if (e.status === 400 && /moderation|safety|content_policy/i.test(`${code} ${e.message}`))
      return new AiError(e.message, "content_policy", false, null, requestId);
    if (e.status === 400 || e.status === 404 || e.status === 422) return new AiError(e.message, "bad_request", false, null, requestId);
    if ((e.status ?? 0) >= 500) return new AiError(e.message, "server", true, retryAfterMs, requestId);
  }
  if (e instanceof Error && e.name === "AbortError") return new AiError("OpenAI request timed out", "timeout", true);
  return new AiError(e instanceof Error ? e.message : String(e), "unknown", false);
}

/** Exponential backoff with full jitter, capped; honours Retry-After when given. */
export function backoffMs(attempt: number, retryAfterMs: number | null, random = Math.random): number {
  if (retryAfterMs) return Math.min(retryAfterMs, 60_000);
  const cap = Math.min(30_000, 1000 * 2 ** attempt);
  return Math.round(cap / 2 + random() * (cap / 2));
}
