"use client";
import { useActionState, useTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Input, Select, Switch, Toast } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { cancelAccountDeletion, changePassword, requestAccountDeletion, updateProfile } from "@/lib/account/actions";
import type { ActionResult } from "@/lib/actions/result";

type Errors = Record<string, string>;
type State = ActionResult<undefined> | null;

export function ProfileForm({ labels, errors, initial }: {
  labels: { displayName: string; displayNameHint: string; language: string; languageHint: string; marketing: string; marketingHint: string; save: string; saved: string };
  errors: Errors; initial: { displayName: string | null; locale: string; marketingOptIn: boolean };
}) {
  const router = useRouter();
  const [state, submit, pending] = useActionState<State, FormData>(updateProfile, null);
  // A language change re-renders the whole app in the new language.
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <form action={submit} style={{ display: "grid", gap: 18 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <Input name="display_name" label={labels.displayName} hint={labels.displayNameHint} iconStart="user" maxLength={80} autoComplete="given-name" defaultValue={initial.displayName ?? ""} />
      <Select name="locale" label={labels.language} hint={labels.languageHint} iconStart="translate" defaultValue={initial.locale}
        options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
      <div style={{ display: "grid", gap: 6 }}>
        <Switch name="marketing_opt_in" label={labels.marketing} icon="envelope-simple" defaultChecked={initial.marketingOptIn} />
        <span className="sl-hint">{labels.marketingHint}</span>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Button type="submit" iconStart="check" disabled={pending}>{labels.save}</Button>
        {state?.ok && <Toast tone="mint" title={labels.saved} style={{ boxShadow: "none", padding: 6 }} />}
      </div>
    </form>
  );
}

export function PasswordForm({ labels, errors }: {
  labels: { currentPassword: string; newPassword: string; newPasswordHint: string; changePassword: string; passwordChanged: string }; errors: Errors;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, submit, pending] = useActionState<State, FormData>(changePassword, null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={submit} style={{ display: "grid", gap: 18 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))" }}>
        <Input name="current_password" type="password" label={labels.currentPassword} iconStart="lock-key" autoComplete="current-password" required />
        <Input name="new_password" type="password" label={labels.newPassword} hint={labels.newPasswordHint} iconStart="lock-key-open" autoComplete="new-password" minLength={8} maxLength={72} required />
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Button type="submit" variant="secondary" iconStart="key" disabled={pending}>{labels.changePassword}</Button>
        {state?.ok && <Toast tone="mint" title={labels.passwordChanged} style={{ boxShadow: "none", padding: 6 }} />}
      </div>
    </form>
  );
}

export function DeletionForm({ labels, errors }: { labels: { deleteReason: string; deleteConfirm: string; deleteCta: string }; errors: Errors }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [state, submit, pending] = useActionState<State, FormData>(requestAccountDeletion, null);
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <form action={submit} style={{ display: "grid", gap: 16 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <Input name="reason" multiline label={labels.deleteReason} maxLength={1000} />
      <Checkbox name="confirm" label={labels.deleteConfirm} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
      <div><Button type="submit" variant="cherry" iconStart="trash" disabled={!confirmed || pending}>{labels.deleteCta}</Button></div>
    </form>
  );
}

export function CancelDeletionButton({ label, errors }: { label: string; errors: Errors }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
      <FormError message={error} />
      <Button variant="secondary" iconStart="arrow-counter-clockwise" disabled={pending} onClick={() => start(async () => {
        const r = await cancelAccountDeletion();
        if (!r.ok) setError(errors[r.error] ?? errors.unknown); else router.refresh();
      })}>{label}</Button>
    </div>
  );
}
