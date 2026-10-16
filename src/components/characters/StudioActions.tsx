"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { approveCharacter, regenerateCharacter } from "@/lib/characters/actions";
import type { ActionResult } from "@/lib/actions/result";

export function ApproveButton({ characterId, referenceId, label, errors, variant = "primary" }: { characterId: string; referenceId: string; label: string; errors: Record<string, string>; variant?: "primary" | "outline" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Button variant={variant} size={variant === "primary" ? "lg" : "sm"} iconStart="check-circle" disabled={pending}
        onClick={() => start(async () => {
          const r = await approveCharacter(characterId, referenceId);
          if (!r.ok) setError(errors[r.error] ?? errors.unknown); else router.refresh();
        })}>{label}</Button>
      <FormError message={error} />
    </div>
  );
}

export function RegenerateForm({ characterId, styles, currentStyleId, labels, errors }: {
  characterId: string; styles: Array<{ id: string; name: string }>; currentStyleId: string; errors: Record<string, string>;
  labels: { corrections: string; correctionsPlaceholder: string; style: string; submit: string };
}) {
  const router = useRouter();
  const [state, submit, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(async (prev, form) => {
    const r = await regenerateCharacter(characterId, prev, form);
    if (r.ok) router.refresh();
    return r;
  }, null);
  return (
    <form action={submit} style={{ display: "grid", gap: 16 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <Select name="style_id" label={labels.style} defaultValue={currentStyleId} iconStart="palette" options={styles.map((s) => ({ value: s.id, label: s.name }))} />
      <Input name="corrections" multiline label={labels.corrections} placeholder={labels.correctionsPlaceholder} maxLength={500} />
      <div><Button type="submit" variant="secondary" iconStart="arrow-clockwise" disabled={pending}>{labels.submit}</Button></div>
    </form>
  );
}
