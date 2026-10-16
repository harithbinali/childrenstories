import "@/lib/server-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — only use after the caller's identity and
 * authorization have been checked (see lib/auth/guards.ts), or from trusted
 * contexts (webhooks with verified signatures, the background worker).
 */
export function createAdminClient(): SupabaseClient {
  cached ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
