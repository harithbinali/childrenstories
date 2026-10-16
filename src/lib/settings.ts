import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/** Typed accessor over platform_settings with defaults for missing keys. */
export async function getSettings<T extends Record<string, unknown>>(defaults: T): Promise<T> {
  const { data, error } = await createAdminClient().from("platform_settings").select("key, value").in("key", Object.keys(defaults));
  if (error) throw new Error(`could not load settings: ${error.message}`);
  const out: Record<string, unknown> = { ...defaults };
  for (const row of data ?? []) out[row.key] = row.value;
  return out as T;
}
