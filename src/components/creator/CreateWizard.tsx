"use client";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AVATAR_TONES, BlobFrame, Button, Card, Icon, Input, Select, Stepper, Tag } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { createBook } from "@/lib/books/actions";
import type { ActionResult } from "@/lib/actions/result";
import { THEME_ICONS } from "@/lib/catalog-icons";
import type { CreatorData } from "@/lib/books/queries";

type Theme = { id: string; slug: string; name: string; isCustom: boolean };
export type WizardLabels = {
  steps: readonly string[]; next: string; back: string; pickChild: string; noChildren: string; pickCharacter: string; noCharacters: string;
  makeCharacter: string; pickTheme: string; ideaTitle: string; ideaLabel: string; ideaPlaceholder: string; ideaHint: string; ideaRequired: string;
  lessonLabel: string; lessonPlaceholder: string; settingsTitle: string; language: string; ageRange: string; length: string; lengthHint: string;
  orientation: string; portrait: string; landscape: string; dedication: string; dedicationPlaceholder: string; write: string; writing: string; free: string;
  addChild: string; pagesLabels: Record<number, string>; ageLabels: Record<string, string>;
};

const ageFromYears = (y: number | null) => (y === null ? "3-5" : y <= 2 ? "0-2" : y <= 5 ? "3-5" : y <= 8 ? "6-8" : "9-12");

function Tile({ selected, onClick, children, tone = "sky" }: { selected: boolean; onClick: () => void; children: ReactNode; tone?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      style={{ display: "grid", gap: 10, justifyItems: "center", alignContent: "start", padding: 16, borderRadius: 26, cursor: "pointer", textAlign: "center", border: 0,
        background: selected ? `var(--tint-${tone})` : "var(--white)",
        boxShadow: selected ? "inset 0 0 0 3px var(--ink-900), 0 5px 0 var(--ink-900)" : "inset 0 0 0 2.5px var(--ink-100), var(--shadow-xs)",
        transform: selected ? "translateY(-3px) rotate(-1deg)" : "none", transition: "all var(--dur-fast) var(--ease-bounce)" }}>
      {children}
    </button>
  );
}

const grid = (min: number) => ({ display: "grid", gap: 16, gridTemplateColumns: `repeat(auto-fill,minmax(min(${min}px,44%),1fr))` });

export function CreateWizard({ data, themes, pageCounts, labels, errors, initial, locale }: {
  data: CreatorData; themes: Theme[]; pageCounts: number[]; labels: WizardLabels; errors: Record<string, string>;
  initial: { childId?: string; characterId?: string }; locale: "en" | "ar";
}) {
  const router = useRouter();
  const firstChild = data.children.find((c) => c.id === initial.childId) ?? data.children[0];
  const [step, setStep] = useState(initial.characterId ? 2 : initial.childId ? 1 : 0);
  const [childId, setChildId] = useState(firstChild?.id ?? "");
  const child = data.children.find((c) => c.id === childId);
  const [characterId, setCharacterId] = useState(initial.characterId ?? child?.characters[0]?.id ?? "");
  const [themeId, setThemeId] = useState("");
  const [idea, setIdea] = useState("");
  const [lesson, setLesson] = useState("");
  const [language, setLanguage] = useState(child?.preferredLanguage ?? locale);
  const [age, setAge] = useState(ageFromYears(child?.ageYears ?? null));
  const [pages, setPages] = useState(pageCounts.includes(12) ? 12 : pageCounts[0] ?? 12);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [dedication, setDedication] = useState("");
  const [state, submit, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(createBook, null);
  useEffect(() => { if (state?.ok) router.push(`/dashboard/books/${state.data.id}`); }, [state, router]);

  const theme = themes.find((t) => t.id === themeId);
  const canNext = [Boolean(child), Boolean(characterId), Boolean(themeId), !theme?.isCustom || idea.trim().length > 0, true][step];
  const pickChild = (id: string) => {
    const c = data.children.find((x) => x.id === id);
    setChildId(id);
    setCharacterId(c?.characters[0]?.id ?? "");
    if (c) { setLanguage(c.preferredLanguage); setAge(ageFromYears(c.ageYears)); }
  };

  return (
    <form action={submit} style={{ display: "grid", gap: 28 }}>
      {Object.entries({ child_id: childId, character_id: characterId, theme_id: themeId, custom_idea: idea, lesson, language, age_range: age, page_count: String(pages), orientation, dedication })
        .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Stepper current={step} steps={labels.steps.map((l, i) => ({ label: l, icon: ["baby", "user-circle", "compass", "lightbulb", "book-open-text"][i] }))} />
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />

      <Card padding="clamp(20px,3vw,32px)" wobble style={{ display: "grid", gap: 22 }}>
        {step === 0 && (
          <>
            <h2 style={{ font: "var(--type-h3)" }}>{labels.pickChild}</h2>
            {data.children.length === 0 ? (
              <div style={{ display: "grid", gap: 14, justifyItems: "start" }}><p>{labels.noChildren}</p><Button href="/dashboard/children?new=1" iconStart="user-circle-plus">{labels.addChild}</Button></div>
            ) : (
              <div role="radiogroup" style={grid(150)}>
                {data.children.map((c, i) => (
                  <Tile key={c.id} selected={c.id === childId} onClick={() => pickChild(c.id)} tone={(["sun", "sky", "bubble", "mint"] as const)[i % 4]}>
                    <Avatar name={c.name} tone={AVATAR_TONES[i % AVATAR_TONES.length]} size={72} />
                    <b style={{ font: "var(--type-h4)", color: "var(--ink-900)" }}>{c.name}</b>
                  </Tile>
                ))}
              </div>
            )}
          </>
        )}

        {step === 1 && child && (
          <>
            <h2 style={{ font: "var(--type-h3)" }}>{labels.pickCharacter}</h2>
            {child.characters.length === 0 ? (
              <div style={{ display: "grid", gap: 14, justifyItems: "start" }}><p>{labels.noCharacters}</p><Button href={`/dashboard/children/${child.id}`} iconStart="magic-wand">{labels.makeCharacter}</Button></div>
            ) : (
              <div role="radiogroup" style={grid(170)}>
                {child.characters.map((ch, i) => (
                  <Tile key={ch.id} selected={ch.id === characterId} onClick={() => setCharacterId(ch.id)} tone="bubble">
                    <BlobFrame src={ch.imageUrl} alt={ch.name} shape={((i % 4) + 1) as 1 | 2 | 3 | 4} tone="bubble" icon="user-circle" label="" aspect="3/4" style={{ width: "100%" }} sticker={false} />
                    <b style={{ font: "var(--type-h4)", color: "var(--ink-900)" }}>{ch.name}</b>
                  </Tile>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ font: "var(--type-h3)" }}>{labels.pickTheme}</h2>
            <div role="radiogroup" style={grid(150)}>
              {themes.map((t, i) => (
                <Tile key={t.id} selected={t.id === themeId} onClick={() => setThemeId(t.id)} tone={(["sun", "sky", "bubble", "mint", "grape", "tangerine"] as const)[i % 6]}>
                  <Icon name={THEME_ICONS[t.slug] ?? "book-open-text"} weight="duotone" size={44} color="var(--ink-900)" />
                  <span style={{ font: "700 15px/1.25 var(--font-body)", color: "var(--ink-900)" }}>{t.name}</span>
                </Tile>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ font: "var(--type-h3)" }}>{labels.ideaTitle}</h2>
            <Input multiline label={labels.ideaLabel} placeholder={labels.ideaPlaceholder} hint={theme?.isCustom && !idea.trim() ? labels.ideaRequired : labels.ideaHint}
              value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1500} />
            <Input label={labels.lessonLabel} placeholder={labels.lessonPlaceholder} value={lesson} onChange={(e) => setLesson(e.target.value)} maxLength={200} iconStart="heart" />
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ font: "var(--type-h3)" }}>{labels.settingsTitle}</h2>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))" }}>
              <Select label={labels.language} value={language} onChange={(e) => setLanguage(e.target.value)} iconStart="translate" options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
              <div className="sl-field">
                <span className="sl-label">{labels.ageRange}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(labels.ageLabels).map(([k, v]) => <Tag key={k} tone="bubble" selected={age === k} onClick={() => setAge(k)}>{v}</Tag>)}
                </div>
              </div>
            </div>
            <div className="sl-field">
              <span className="sl-label">{labels.length}</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {pageCounts.map((n) => <Tag key={n} icon="book-open" selected={pages === n} onClick={() => setPages(n)}>{labels.pagesLabels[n]}</Tag>)}
              </div>
              <span className="sl-hint">{labels.lengthHint}</span>
            </div>
            <div className="sl-field">
              <span className="sl-label">{labels.orientation}</span>
              <div role="radiogroup" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {(["portrait", "landscape"] as const).map((o) => (
                  <Tile key={o} selected={orientation === o} onClick={() => setOrientation(o)} tone="sky">
                    <span aria-hidden style={{ width: o === "portrait" ? 48 : 72, height: o === "portrait" ? 72 : 48, borderRadius: 8, background: "var(--blue-400)", boxShadow: "inset 0 -14px 0 var(--paper)" }} />
                    <span style={{ font: "700 15px var(--font-body)", color: "var(--ink-900)" }}>{o === "portrait" ? labels.portrait : labels.landscape}</span>
                  </Tile>
                ))}
              </div>
            </div>
            <Input multiline label={labels.dedication} placeholder={labels.dedicationPlaceholder} value={dedication} onChange={(e) => setDedication(e.target.value)} maxLength={300} />
            <p style={{ display: "flex", gap: 10, alignItems: "center", font: "var(--type-small)", color: "var(--mint-600)" }}><Icon name="gift" size={22} />{labels.free}</p>
          </>
        )}
      </Card>

      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
        {step > 0 ? <Button variant="outline" iconStart="arrow-left" onClick={() => setStep(step - 1)}>{labels.back}</Button> : <span />}
        {step < 4 ? (
          <Button variant="secondary" iconEnd="arrow-right" disabled={!canNext} onClick={() => setStep(step + 1)}>{labels.next}</Button>
        ) : (
          <Button type="submit" size="lg" iconStart="magic-wand" disabled={pending}>{pending ? labels.writing : labels.write}</Button>
        )}
      </div>
    </form>
  );
}
