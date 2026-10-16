"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { fail, ok, run, type ActionResult } from "@/lib/actions/result";
import { LOCALE_COOKIE } from "@/i18n/config";

const ProfileInput = z.object({
  display_name: z.string().trim().max(80).transform((v) => v || null),
  locale: z.enum(["en", "ar"]),
  marketing_opt_in: z.boolean(),
});

/** Name, language and email preferences. The language also becomes the site language. */
export async function updateProfile(_: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const input = ProfileInput.safeParse({
      display_name: String(form.get("display_name") ?? ""),
      locale: form.get("locale"),
      marketing_opt_in: form.get("marketing_opt_in") === "on",
    });
    if (!input.success) return fail("invalid_input");
    const db = await createClient();
    const { error } = await db.from("profiles").update(input.data).eq("id", user.id);
    if (error) throw new Error(error.message);
    (await cookies()).set(LOCALE_COOKIE, input.data.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
    return ok(undefined);
  });
}

const NewPassword = z.string().min(8).max(72);

/** Re-checks the current password before setting a new one. */
export async function changePassword(_: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const current = String(form.get("current_password") ?? "");
    const next = NewPassword.safeParse(form.get("new_password"));
    if (!next.success) return fail("weak_password");
    if (!user.email || !current) return fail("wrong_password");
    await enforceRateLimit(`password-change:${user.id}`, 5, 15 * 60);
    const db = await createClient();
    const { error: authError } = await db.auth.signInWithPassword({ email: user.email, password: current });
    if (authError) return fail("wrong_password");
    const { error } = await db.auth.updateUser({ password: next.data });
    if (error) return fail(error.code === "weak_password" || error.code === "same_password" ? "weak_password" : "unknown");
    return ok(undefined);
  });
}

/**
 * Asks for the account and all its data to be deleted. Nothing is removed
 * straight away: there is a 7-day grace period in which the parent can
 * change their mind, then staff process the request (Admin → Privacy).
 */
export async function requestAccountDeletion(_: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    if (form.get("confirm") !== "on") return fail("invalid_input");
    await enforceRateLimit(`deletion-request:${user.id}`, 5, 24 * 3600);
    const reason = String(form.get("reason") ?? "").trim().slice(0, 1000) || null;
    const db = await createClient();
    const { error } = await db.from("account_deletion_requests").insert({ user_id: user.id, reason });
    // 23505: an open request already exists — treat as success.
    if (error && error.code !== "23505") throw new Error(error.message);
    revalidatePath("/dashboard/settings");
    return ok(undefined);
  });
}

export async function cancelAccountDeletion(): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    // Parents can't update requests under RLS; the service role cancels only their own pending one.
    const { data, error } = await createAdminClient()
      .from("account_deletion_requests")
      .update({ status: "cancelled", processed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) return fail("wrong_state");
    revalidatePath("/dashboard/settings");
    return ok(undefined);
  });
}
