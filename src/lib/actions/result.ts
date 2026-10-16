import { LimitError } from "@/lib/limits/check";
import type { LimitCode } from "@/lib/limits/policy";
import { RateLimitedError } from "@/lib/rate-limit";

/** Error codes every mutation can return; UIs map them to friendly copy. */
export type ActionError =
  | "invalid_input" | "not_found" | "forbidden" | "rate_limited" | "not_configured" | "flagged"
  | "moderation_unavailable" | "unsupported_image" | "image_too_large" | "image_too_small" | "duplicate_photo"
  | "too_many_photos" | "guardian_required" | "wrong_state" | "wrong_password" | "weak_password" | "ticket_closed" | LimitCode | "unknown";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: ActionError): ActionResult<never> => ({ ok: false, error });

/** Converts thrown domain errors into ActionResults; unexpected errors are logged. */
export async function run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LimitError) return fail(e.code);
    if (e instanceof RateLimitedError) return fail("rate_limited");
    if (e instanceof Error && /Missing or invalid environment variable/.test(e.message)) return fail("not_configured");
    // redirect()/notFound() throw special errors that must propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[action] unexpected error", e);
    return fail("unknown");
  }
}
