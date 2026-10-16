"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, Input } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { createCharacter } from "@/lib/characters/actions";
import type { ActionResult } from "@/lib/actions/result";
import type { CatalogStyle } from "@/lib/catalog";
import { STYLE_ICONS } from "@/lib/catalog-icons";

/** Style picker as big tappable tiles + name + optional corrections. */
export function CharacterCreateForm({ childId, defaultName, styles, labels, errors }: {
  childId: string; defaultName: string; styles: CatalogStyle[]; errors: Record<string, string>;
  labels: { name: string; style: string; corrections: string; correctionsPlaceholder: string; create: string };
}) {
  const router = useRouter();
  const [style, setStyle] = useState(styles[0]?.id ?? "");
  const [state, submit, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(createCharacter, null);
  useEffect(() => {
    if (state?.ok) router.push(`/dashboard/characters/${state.data.id}`);
  }, [state, router]);
  return (
    <form action={submit} style={{ display: "grid", gap: 18 }}>
      <input type="hidden" name="child_id" value={childId} />
      <input type="hidden" name="style_id" value={style} />
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
        <legend className="sl-label" style={{ marginBottom: 10 }}>{labels.style}</legend>
        <div role="radiogroup" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(min(140px,45%),1fr))" }}>
          {styles.map((s, i) => {
            const on = s.id === style;
            return (
              <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setStyle(s.id)}
                style={{ display: "grid", gap: 8, justifyItems: "center", padding: 14, borderRadius: 22, cursor: "pointer", textAlign: "center",
                  background: on ? `var(--tint-${["sun", "sky", "bubble", "grape"][i % 4]})` : "var(--white)",
                  border: 0, boxShadow: on ? "inset 0 0 0 3px var(--ink-900), 0 4px 0 var(--ink-900)" : "inset 0 0 0 2.5px var(--ink-100)",
                  transition: "all var(--dur-fast) var(--ease-bounce)", transform: on ? "translateY(-2px)" : "none" }}>
                <Icon name={STYLE_ICONS[s.slug] ?? "palette"} weight="duotone" size={36} color="var(--ink-900)" />
                <span style={{ font: "700 15px/1.2 var(--font-body)", color: "var(--ink-900)" }}>{s.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <Input name="name" label={labels.name} defaultValue={defaultName} required maxLength={60} iconStart="star" />
      <Input name="corrections" multiline label={labels.corrections} placeholder={labels.correctionsPlaceholder} maxLength={500} />
      <div><Button type="submit" iconStart="magic-wand" disabled={pending || !style}>{labels.create}</Button></div>
    </form>
  );
}
