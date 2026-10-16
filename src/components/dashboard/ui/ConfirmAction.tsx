"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, type ButtonVariant } from "@/components/storyling";
import type { ActionResult } from "@/lib/actions/result";

/** A destructive action behind a friendly confirmation dialog. */
export function ConfirmAction({ action, label, title, body, confirmLabel, cancelLabel, errors, redirectTo, icon = "trash", variant = "outline" }: {
  action: () => Promise<ActionResult<unknown>>; label: string; title: string; body: string; confirmLabel: string; cancelLabel: string;
  errors: Record<string, string>; redirectTo?: string; icon?: string; variant?: ButtonVariant;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button variant={variant} size="sm" iconStart={icon} onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} icon="warning" tone="cherry" title={title} closeLabel={cancelLabel}
        actions={<>
          <Button variant="outline" onClick={() => setOpen(false)}>{cancelLabel}</Button>
          <Button variant="cherry" iconStart={icon} disabled={pending} onClick={() => start(async () => {
            const r = await action();
            if (!r.ok) { setError(errors[r.error] ?? errors.unknown); return; }
            setOpen(false);
            if (redirectTo) router.push(redirectTo); else router.refresh();
          })}>{confirmLabel}</Button>
        </>}>
        <p>{body}</p>
        {error && <p role="alert" style={{ color: "var(--cherry-600)", fontWeight: 700, marginTop: 12 }}>{error}</p>}
      </Dialog>
    </>
  );
}
