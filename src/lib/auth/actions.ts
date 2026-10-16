"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit";
import { hasEnv } from "@/lib/env";
import { isLocale } from "@/i18n/config";

export type AuthErrorCode =
  | "invalid_email" | "weak_password" | "invalid_credentials" | "email_not_confirmed" | "already_registered"
  | "terms_required" | "rate_limited" | "not_configured" | "link_expired" | "unknown";

export type AuthState = { error?: AuthErrorCode; ok?: boolean; email?: string };

const email = z.email().max(254);
const password = z.string().min(8).max(72);

/** Only same-site relative paths are allowed as post-login destinations. */
export async function safeNext(next: FormDataEntryValue | string | null | undefined, fallback = "/dashboard"): Promise<string> {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Shared guard: configuration + per-IP rate limit (10 attempts / 5 min per action). */
async function guard(action: string): Promise<AuthErrorCode | null> {
  if (!hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")) return "not_configured";
  try {
    await enforceRateLimit(`auth:${action}:${await clientIp()}`, 10, 300);
  } catch (e) {
    if (e instanceof RateLimitedError) return "rate_limited";
    throw e;
  }
  return null;
}

function mapError(code: string | undefined, message: string): AuthErrorCode {
  if (code === "invalid_credentials") return "invalid_credentials";
  if (code === "email_not_confirmed") return "email_not_confirmed";
  if (code === "user_already_exists" || code === "email_exists") return "already_registered";
  if (code === "weak_password") return "weak_password";
  if (code === "email_address_invalid" || code === "validation_failed") return "invalid_email";
  if (code?.startsWith("over_") || /rate limit/i.test(message)) return "rate_limited";
  if (code === "otp_expired" || code === "flow_state_expired") return "link_expired";
  console.error("[auth] unexpected error", code, message);
  return "unknown";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const e = email.safeParse(String(form.get("email") ?? "").trim());
  if (!e.success) return { error: "invalid_email" };
  const blocked = await guard("signin");
  if (blocked) return { error: blocked, email: e.data };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: e.data, password: String(form.get("password") ?? "") });
  if (error) return { error: mapError(error.code, error.message), email: e.data };
  redirect(await safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const e = email.safeParse(String(form.get("email") ?? "").trim());
  if (!e.success) return { error: "invalid_email" };
  if (!password.safeParse(form.get("password")).success) return { error: "weak_password", email: e.data };
  if (form.get("terms") !== "on") return { error: "terms_required", email: e.data };
  const blocked = await guard("signup");
  if (blocked) return { error: blocked, email: e.data };

  const locale = isLocale(form.get("locale")) ? String(form.get("locale")) : "en";
  const displayName = String(form.get("display_name") ?? "").trim().slice(0, 80) || null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: e.data,
    password: String(form.get("password")),
    options: {
      emailRedirectTo: `${await siteUrl()}/api/auth/callback?next=/dashboard`,
      data: { display_name: displayName, locale },
    },
  });
  if (error) return { error: mapError(error.code, error.message), email: e.data };
  // With email confirmation on, Supabase returns a user with no identities for an existing address.
  if (data.user && data.user.identities?.length === 0) return { error: "already_registered", email: e.data };
  if (data.session) redirect("/dashboard");
  redirect(`/verify-email?email=${encodeURIComponent(e.data)}`);
}

/** Always reports success so the form can't be used to discover accounts. */
export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const e = email.safeParse(String(form.get("email") ?? "").trim());
  if (!e.success) return { error: "invalid_email" };
  const blocked = await guard("reset");
  if (blocked) return { error: blocked, email: e.data };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(e.data, { redirectTo: `${await siteUrl()}/api/auth/callback?next=/reset-password` });
  if (error && mapError(error.code, error.message) === "rate_limited") return { error: "rate_limited", email: e.data };
  return { ok: true, email: e.data };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  if (!password.safeParse(form.get("password")).success) return { error: "weak_password" };
  const blocked = await guard("update-password");
  if (blocked) return { error: blocked };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: "link_expired" };
  const { error } = await supabase.auth.updateUser({ password: String(form.get("password")) });
  if (error) return { error: mapError(error.code, error.message) };
  redirect("/dashboard?password=updated");
}

export async function resendVerification(_: AuthState, form: FormData): Promise<AuthState> {
  const e = email.safeParse(String(form.get("email") ?? "").trim());
  if (!e.success) return { error: "invalid_email" };
  const blocked = await guard("resend");
  if (blocked) return { error: blocked, email: e.data };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: e.data, options: { emailRedirectTo: `${await siteUrl()}/api/auth/callback?next=/dashboard` } });
  if (error && mapError(error.code, error.message) === "rate_limited") return { error: "rate_limited", email: e.data };
  return { ok: true, email: e.data };
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  if (await guard("oauth")) redirect("/login?error=not_configured");
  const supabase = await createClient();
  const next = await safeNext(form.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/api/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=unknown");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  if (hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
