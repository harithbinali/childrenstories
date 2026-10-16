"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Checkbox, Icon, Input, Select, Toast } from "@/components/storyling";
import {
  requestPasswordReset, resendVerification, signIn, signInWithGoogle, signUp, updatePassword,
  type AuthErrorCode, type AuthState,
} from "@/lib/auth/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type A = Dictionary["auth"];

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
      <h1 style={{ font: "var(--type-h2)" }}>{title}</h1>
      {sub && <p style={{ color: "var(--ink-700)" }}>{sub}</p>}
    </div>
  );
}

function ErrorNote({ a, code }: { a: A; code?: AuthErrorCode | null }) {
  if (!code) return null;
  return (
    <div role="alert" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 18, background: "var(--cherry-100)", color: "var(--cherry-600)", font: "700 14px/1.4 var(--font-body)", marginBottom: 18 }}>
      <Icon name="warning-circle" size={20} />
      {a.errors[code] ?? a.errors.unknown}
    </div>
  );
}

const urlError = (v: string | null): AuthErrorCode | null =>
  v && ["link_expired", "not_configured", "unknown"].includes(v) ? (v as AuthErrorCode) : null;

export function LoginForm({ a, googleEnabled }: { a: A; googleEnabled: boolean }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const next = params.get("next") ?? "";
  return (
    <>
      <Heading title={a.loginTitle} sub={a.loginSub} />
      <ErrorNote a={a} code={state.error ?? urlError(params.get("error"))} />
      <form action={action} style={{ display: "grid", gap: 18 }}>
        <input type="hidden" name="next" value={next} />
        <Input label={a.email} name="email" type="email" dir="ltr" autoComplete="email" required iconStart="envelope-simple" placeholder={a.emailPlaceholder} defaultValue={state.email} />
        <Input label={a.password} name="password" type="password" autoComplete="current-password" required iconStart="lock-key" />
        <Link href="/forgot-password" style={{ justifySelf: "end", fontSize: 15 }}>{a.forgot}</Link>
        <Button type="submit" block size="lg" disabled={pending} iconEnd="arrow-right">{a.loginCta}</Button>
      </form>
      {googleEnabled && <GoogleButton a={a} next={next} />}
      <p style={{ marginTop: 22, textAlign: "center" }}>{a.noAccount} <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>{a.noAccountLink}</Link></p>
    </>
  );
}

function GoogleButton({ a, next }: { a: A; next: string }) {
  return (
    <form action={signInWithGoogle} style={{ display: "grid", gap: 14, marginTop: 18 }}>
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-400)", font: "700 13px var(--font-body)" }}>
        <span style={{ flex: 1, borderTop: "2px dashed var(--ink-100)" }} />{a.or}<span style={{ flex: 1, borderTop: "2px dashed var(--ink-100)" }} />
      </div>
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant="outline" block iconStart="google-logo">{a.google}</Button>
    </form>
  );
}

export function RegisterForm({ a, locale, googleEnabled }: { a: A; locale: Locale; googleEnabled: boolean }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const fieldError = (c: AuthErrorCode) => (state.error === c ? a.errors[c] : undefined);
  return (
    <>
      <Heading title={a.registerTitle} sub={a.registerSub} />
      <ErrorNote a={a} code={state.error && !["invalid_email", "weak_password", "terms_required"].includes(state.error) ? state.error : null} />
      <form action={action} style={{ display: "grid", gap: 18 }} noValidate>
        <Input label={a.displayName} name="display_name" autoComplete="given-name" iconStart="user" placeholder={a.displayNamePlaceholder} maxLength={80} />
        <Input label={a.email} name="email" type="email" dir="ltr" autoComplete="email" required iconStart="envelope-simple" placeholder={a.emailPlaceholder} defaultValue={state.email} error={fieldError("invalid_email")} />
        <Input label={a.password} name="password" type="password" autoComplete="new-password" required minLength={8} iconStart="lock-key" hint={a.passwordHint} error={fieldError("weak_password")} />
        <Select label={a.preferredLanguage} name="locale" defaultValue={locale} iconStart="translate" options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
        <div>
          <Checkbox name="terms" label={<span>{a.terms} <Link href="/terms" target="_blank" aria-label={a.termsLink}><Icon name="arrow-square-out" weight="bold" /></Link></span>} />
          {fieldError("terms_required") && <span className="sl-hint sl-hint--error" role="alert"><Icon name="warning-circle" />{fieldError("terms_required")}</span>}
        </div>
        <Button type="submit" block size="lg" disabled={pending} iconStart="magic-wand">{a.registerCta}</Button>
      </form>
      {googleEnabled && <GoogleButton a={a} next={params.get("next") ?? ""} />}
      <p style={{ marginTop: 22, textAlign: "center" }}>{a.haveAccount} <Link href="/login">{a.haveAccountLink}</Link></p>
    </>
  );
}

export function ForgotPasswordForm({ a }: { a: A }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <>
      <Heading title={a.forgotTitle} sub={a.forgotSub} />
      <ErrorNote a={a} code={state.error && state.error !== "invalid_email" ? state.error : urlError(params.get("error"))} />
      {state.ok ? (
        <Toast tone="mint" icon="envelope-simple-open" title={a.forgotSent} />
      ) : (
        <form action={action} style={{ display: "grid", gap: 18 }}>
          <Input label={a.email} name="email" type="email" dir="ltr" autoComplete="email" required iconStart="envelope-simple" placeholder={a.emailPlaceholder} defaultValue={state.email} error={state.error === "invalid_email" ? a.errors.invalid_email : undefined} />
          <Button type="submit" block size="lg" disabled={pending} iconStart="paper-plane-tilt">{a.forgotCta}</Button>
        </form>
      )}
      <p style={{ marginTop: 22, textAlign: "center" }}><Link href="/login">{a.backToLogin}</Link></p>
    </>
  );
}

export function ResetPasswordForm({ a }: { a: A }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <>
      <Heading title={a.resetTitle} />
      <ErrorNote a={a} code={state.error && state.error !== "weak_password" ? state.error : null} />
      <form action={action} style={{ display: "grid", gap: 18 }}>
        <Input label={a.password} name="password" type="password" autoComplete="new-password" required minLength={8} iconStart="lock-key" hint={a.passwordHint} error={state.error === "weak_password" ? a.errors.weak_password : undefined} />
        <Button type="submit" block size="lg" disabled={pending} iconStart="check">{a.resetCta}</Button>
      </form>
      {state.error === "link_expired" && <p style={{ marginTop: 18, textAlign: "center" }}><Link href="/forgot-password">{a.forgotCta}</Link></p>}
    </>
  );
}

export function VerifyEmailPanel({ a }: { a: A }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthState, FormData>(resendVerification, {});
  const email = params.get("email") ?? "";
  return (
    <div style={{ display: "grid", gap: 18, justifyItems: "center", textAlign: "center" }}>
      <span style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--sun-400)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sticker)" }} className="sl-pop-in">
        <Icon name="envelope-simple-open" size={44} color="var(--ink-900)" />
      </span>
      <Heading title={a.verifyTitle} sub={a.verifySub} />
      {email && <b style={{ color: "var(--ink-900)", marginTop: -14 }} dir="ltr">{email}</b>}
      <ErrorNote a={a} code={state.error} />
      {state.ok ? (
        <Toast tone="mint" title={a.verifyResent} />
      ) : (
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="outline" disabled={pending || !email} iconStart="arrow-clockwise">{a.verifyResend}</Button>
        </form>
      )}
      <Link href="/login">{a.backToLogin}</Link>
    </div>
  );
}
