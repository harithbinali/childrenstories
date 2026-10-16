import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Append-only audit trail for privileged actions (admin + staff). */
export async function audit(
  actorId: string,
  action: string,
  target?: { table: string; id: string },
  details: Record<string, unknown> = {},
): Promise<void> {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  } catch {
    // outside a request (worker) — no IP
  }
  const { error } = await createAdminClient().from("admin_audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: target?.table ?? null,
    target_id: target?.id ?? null,
    details,
    ip_address: ip,
  });
  if (error) throw new Error(`audit log write failed: ${error.message}`);
}
