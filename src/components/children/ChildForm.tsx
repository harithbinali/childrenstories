"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Toast } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { createChild, updateChild } from "@/lib/children/actions";
import type { ActionResult } from "@/lib/actions/result";

export type ChildFormLabels = {
  name: string; namePlaceholder: string; nameHint: string; age: string; agePlaceholder: string; interests: string;
  interestsPlaceholder: string; interestsHint: string; language: string; appearance: string; appearancePlaceholder: string;
  appearanceHint: string; save: string; saved: string;
};
export type ChildValues = { id?: string; display_name?: string; age_years?: number | null; interests?: string[]; preferred_language?: string; appearance_notes?: string | null };

export function ChildForm({ labels, errors, initial = {}, defaultLanguage }: { labels: ChildFormLabels; errors: Record<string, string>; initial?: ChildValues; defaultLanguage: string }) {
  const router = useRouter();
  const action = initial.id ? updateChild.bind(null, initial.id) : createChild;
  const [state, submit, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);
  useEffect(() => {
    if (state?.ok && !initial.id) router.push(`/dashboard/children/${state.data.id}`);
  }, [state, initial.id, router]);
  return (
    <form action={submit} style={{ display: "grid", gap: 18 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))" }}>
        <Input name="display_name" label={labels.name} placeholder={labels.namePlaceholder} hint={labels.nameHint} iconStart="baby" required maxLength={40} defaultValue={initial.display_name} />
        <Input name="age_years" label={labels.age} placeholder={labels.agePlaceholder} type="number" min={0} max={14} inputMode="numeric" iconStart="cake" defaultValue={initial.age_years ?? undefined} />
      </div>
      <Input name="interests" label={labels.interests} placeholder={labels.interestsPlaceholder} hint={labels.interestsHint} iconStart="heart" defaultValue={initial.interests?.join(", ")} />
      <Select name="preferred_language" label={labels.language} iconStart="translate" defaultValue={initial.preferred_language ?? defaultLanguage}
        options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
      <Input name="appearance_notes" multiline label={labels.appearance} placeholder={labels.appearancePlaceholder} hint={labels.appearanceHint} maxLength={500} defaultValue={initial.appearance_notes ?? undefined} />
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Button type="submit" iconStart="check" disabled={pending}>{labels.save}</Button>
        {state?.ok && initial.id && <Toast tone="mint" title={labels.saved} style={{ boxShadow: "none", padding: 6 }} />}
      </div>
    </form>
  );
}
