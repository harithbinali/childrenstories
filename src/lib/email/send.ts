import "@/lib/server-guard";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { renderEmail, type EmailData, type EmailTemplate } from "./templates";

/**
 * Sends one transactional email at most once per idempotency key and logs the
 * outcome in email_log (without storing the recipient address).
 */
export async function sendTransactionalEmail(args: {
  template: EmailTemplate;
  userId: string;
  idempotencyKey: string;
  data: Omit<EmailData, "brand" | "siteUrl" | "locale" | "recipientName">;
}) {
  const db = createAdminClient();
  const { data: existing } = await db.from("email_log").select("status").eq("idempotency_key", args.idempotencyKey).maybeSingle();
  if (existing?.status === "sent") return { skipped: true };

  const [{ data: authUser }, { data: profile }, settings] = await Promise.all([
    db.auth.admin.getUserById(args.userId),
    db.from("profiles").select("display_name, locale, status").eq("id", args.userId).single(),
    getSettings({ "brand.name": "Storyling" }),
  ]);
  const to = authUser?.user?.email;
  if (!to || !profile || profile.status === "deleted") {
    await db.from("email_log").upsert({ user_id: args.userId, template: args.template, idempotency_key: args.idempotencyKey, status: "skipped", error: "no deliverable address" }, { onConflict: "idempotency_key" });
    return { skipped: true };
  }

  const rendered = renderEmail(args.template, {
    ...args.data,
    brand: String(settings["brand.name"]),
    siteUrl: env("NEXT_PUBLIC_SITE_URL"),
    locale: profile.locale,
    recipientName: profile.display_name,
  });
  const resend = new Resend(env("RESEND_API_KEY"));
  const { data, error } = await resend.emails.send(
    { from: env("EMAIL_FROM"), to, subject: rendered.subject, html: rendered.html, text: rendered.text },
    { idempotencyKey: args.idempotencyKey },
  );
  await db.from("email_log").upsert(
    { user_id: args.userId, template: args.template, idempotency_key: args.idempotencyKey, status: error ? "failed" : "sent", provider_message_id: data?.id ?? null, error: error?.message ?? null },
    { onConflict: "idempotency_key" },
  );
  if (error) throw new Error(`email send failed: ${error.message}`);
  return { id: data?.id };
}
