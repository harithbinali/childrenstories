"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Icon, Input, Toast } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { approveStory, regenerateStory, rewritePage, saveStory } from "@/lib/books/actions";

export type EditorLabels = {
  titleLabel: string; pageLabels: Record<number, string>; save: string; saved: string; rewrite: string; rewriteHint: string;
  rewriting: string; newDraft: string; approve: string; redrawsLeft: string;
};

/**
 * Parent edits the words; each save creates a new story version. Rewrites
 * run in the background — pages being rewritten are locked until done.
 */
export function StoryEditor({ bookId, title, pages, rewritingPages, labels, errors, mode }: {
  bookId: string; title: string; pages: Array<{ number: number; text: string }>; rewritingPages: number[];
  labels: EditorLabels; errors: Record<string, string>; mode: "draft" | "completed";
}) {
  const router = useRouter();
  const [t, setT] = useState(title);
  const [texts, setTexts] = useState<Record<number, string>>(() => Object.fromEntries(pages.map((p) => [p.number, p.text])));
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = t !== title || pages.some((p) => texts[p.number] !== p.text);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(errors[r.error ?? "unknown"] ?? errors.unknown);
      else { after?.(); router.refresh(); }
    });
  const save = () => act(() => saveStory(bookId, { title: t, pages: Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, v])) }), () => setSaved(true));

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <FormError message={error} />
      <Input label={labels.titleLabel} value={t} onChange={(e) => { setT(e.target.value); setSaved(false); }} maxLength={120} iconStart="book-open-text" />
      <div style={{ display: "grid", gap: 16 }}>
        {pages.map((p, i) => {
          const busy = rewritingPages.includes(p.number);
          return (
            <Card key={p.number} tone={(["white", "paper"] as const)[i % 2]} padding={20} style={{ display: "grid", gap: 12 }}>
              <Input multiline label={labels.pageLabels[p.number]} value={texts[p.number] ?? ""} disabled={busy || pending} maxLength={1200}
                onChange={(e) => { setTexts({ ...texts, [p.number]: e.target.value }); setSaved(false); }} />
              {mode === "draft" && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <Input label={labels.rewriteHint} value={notes[p.number] ?? ""} onChange={(e) => setNotes({ ...notes, [p.number]: e.target.value })} maxLength={500} disabled={busy} style={{ flex: "1 1 240px" }} />
                  <Button variant="outline" size="sm" iconStart={busy ? "spinner-gap" : "sparkle"} disabled={busy || pending || dirty}
                    onClick={() => act(() => rewritePage(bookId, p.number, notes[p.number] ?? ""))}>{busy ? labels.rewriting : labels.rewrite}</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", position: "sticky", bottom: 12, padding: 12, borderRadius: 28, background: "rgba(255,251,242,.92)", backdropFilter: "blur(var(--blur-glass))", boxShadow: "var(--shadow-soft)", zIndex: 5 }}>
        <Button variant={mode === "draft" ? "outline" : "primary"} iconStart="floppy-disk" disabled={!dirty || pending} onClick={save}>{labels.save}</Button>
        {mode === "draft" && (
          <>
            <Button iconStart="paint-brush-broad" disabled={dirty || pending || rewritingPages.length > 0} onClick={() => act(() => approveStory(bookId))}>{labels.approve}</Button>
            <Button variant="ghost" iconStart="arrow-clockwise" disabled={pending} onClick={() => act(() => regenerateStory(bookId))}>{labels.newDraft}</Button>
            <span style={{ font: "var(--type-caption)", color: "var(--ink-500)", display: "inline-flex", gap: 6, alignItems: "center" }}><Icon name="sparkle" />{labels.redrawsLeft}</span>
          </>
        )}
        {saved && !dirty && <Toast tone="mint" title={labels.saved} style={{ boxShadow: "none", padding: 4 }} />}
      </div>
    </div>
  );
}
