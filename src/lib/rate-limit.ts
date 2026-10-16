import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment and try again.");
  }
}

/** Throws RateLimitedError when `key` exceeded `limit` calls in the current window. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`rate limit check failed: ${error.message}`);
  if (data === false) throw new RateLimitedError(windowSeconds);
}
