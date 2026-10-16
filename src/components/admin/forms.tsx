"use client";
import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Toast, type ButtonVariant } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import type { ActionResult } from "@/lib/actions/result";

type Errors = Record<string, string>;

/** A server-action form with inline error/saved feedback. Inputs are passed as children. */
export function ActionForm({ action, submit, saved, errors, children, variant = "primary", icon = "check", columns, resetOnSuccess }: {
  action: (prev: ActionResult<undefined> | null, form: FormData) => Promise<ActionResult<undefined>>; submit: string; saved: string; errors: Errors;
  children: ReactNode; variant?: ButtonVariant; icon?: string; columns?: number; resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, run, pending] = useActionState(action, null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!state?.ok) return;
    router.refresh();
    if (resetOnSuccess) setKey((k) => k + 1); // eslint-disable-line react-hooks/set-state-in-effect -- remount clears inputs after a successful create
  }, [state, router, resetOnSuccess]);
  return (
    <form key={key} action={run} style={{ display: "grid", gap: 14 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: columns ? `repeat(auto-fit,minmax(min(${Math.round(720 / columns)}px,100%),1fr))` : undefined, alignItems: "start" }}>{children}</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Button type="submit" size="sm" variant={variant} iconStart={icon} disabled={pending}>{submit}</Button>
        {state?.ok && <Toast tone="mint" title={saved} style={{ boxShadow: "none", padding: 4 }} />}
      </div>
    </form>
  );
}

/** One-click action (no confirmation) — e.g. retry a job. */
export function ActionButton({ action, label, errors, icon = "arrow-clockwise", variant = "outline", done }: {
  action: () => Promise<ActionResult<unknown>>; label: string; errors: Errors; icon?: string; variant?: ButtonVariant; done?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <Button size="sm" variant={variant} iconStart={icon} disabled={pending} onClick={() => start(async () => {
        const r = await action();
        setMsg(r.ok ? (done ? { ok: true, text: done } : null) : { ok: false, text: errors[r.error] ?? errors.unknown });
        if (r.ok) router.refresh();
      })}>{label}</Button>
      {msg && <span role={msg.ok ? "status" : "alert"} style={{ font: "700 13px var(--font-body)", color: msg.ok ? "var(--mint-600)" : "var(--cherry-600)" }}>{msg.text}</span>}
    </span>
  );
}
