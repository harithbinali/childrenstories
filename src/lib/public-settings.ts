import "@/lib/server-guard";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export const PUBLIC_SETTINGS_TAG = "public-settings";

/** Public platform settings (is_public rows, readable by anon). Null values when Supabase isn't configured. */
export async function getPublicSettings(): Promise<{ supportEmail: string | null }> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_SETTINGS_TAG);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { supportEmail: null };
  const { data } = await createClient(url, key, { auth: { persistSession: false } }).from("platform_settings").select("key, value").eq("key", "brand.support_email").maybeSingle();
  const email = typeof data?.value === "string" ? data.value : null;
  // The seed ships a placeholder address; don't show it to visitors.
  return { supportEmail: email && !email.endsWith("@example.com") ? email : null };
}
