import "@/lib/server-guard";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export const PUBLIC_SETTINGS_TAG = "public-settings";

/** Public platform settings (is_public rows, readable by anon). Null values when Supabase isn't configured. */
export async function getPublicSettings(): Promise<{ supportEmail: string | null; googleAuth: boolean }> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_SETTINGS_TAG);
  // NEXT_PUBLIC_GOOGLE_AUTH=true forces Google sign-in on regardless of the admin switch.
  const envGoogle = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { supportEmail: null, googleAuth: envGoogle };
  const { data } = await createClient(url, key, { auth: { persistSession: false } }).from("platform_settings").select("key, value").in("key", ["brand.support_email", "features.google_auth"]);
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  const email = typeof get("brand.support_email") === "string" ? (get("brand.support_email") as string) : null;
  // The seed ships a placeholder address; don't show it to visitors.
  return { supportEmail: email && !email.endsWith("@example.com") ? email : null, googleAuth: envGoogle || get("features.google_auth") === true };
}
