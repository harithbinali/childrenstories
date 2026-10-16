import { Button, Card, Icon } from "@/components/storyling";
import { PLACEHOLDER, type LegalDoc, type LegalSlug } from "@/content/legal/types";
import type { Dictionary } from "@/i18n/dictionaries";
import { PageHero } from "./PageParts";

export const LEGAL_PATHS: Record<LegalSlug, string> = { privacy: "/privacy", terms: "/terms", refunds: "/refund-policy", photoPrivacy: "/child-photo-privacy" };
const ICONS: Record<LegalSlug, string> = { privacy: "lock-key", terms: "scroll", refunds: "receipt", photoPrivacy: "camera" };

/** Highlights [PLACEHOLDER] tokens so nobody mistakes draft text for final wording. */
function Text({ children }: { children: string }) {
  return (
    <>
      {children.split(PLACEHOLDER).map((part, i) =>
        i % 2 ? <mark key={i} dir="ltr" style={{ background: "var(--sun-200)", color: "var(--ink-900)", borderRadius: 6, padding: "0 4px", fontWeight: 700, unicodeBidi: "isolate" }}>{part}</mark> : part,
      )}
    </>
  );
}

const anchor = (i: number) => `section-${i + 1}`;

export function LegalView({ d, slug, doc, docs }: { d: Dictionary; slug: LegalSlug; doc: LegalDoc; docs: Record<LegalSlug, LegalDoc> }) {
  return (
    <>
      <PageHero title={doc.title} sub={doc.summary} icon={ICONS[slug]} />
      <section style={{ padding: "clamp(16px,3vw,32px) 0 var(--section-y)" }}>
        <div className="sl-wrap grid wide:grid-cols-[260px_1fr] gap-10 items-start">
          <aside className="wide:sticky wide:top-24" style={{ display: "grid", gap: 18 }}>
            <Card tone="sun" variant="flat" padding={16} style={{ display: "flex", gap: 10, alignItems: "flex-start", font: "var(--type-small)", fontWeight: 700 }}>
              <Icon name="note-pencil" size={22} style={{ flex: "none" }} /><span><Text>{d.pages.legalDraft}</Text></span>
            </Card>
            <nav aria-label={d.pages.contents} className="hidden wide:grid" style={{ gap: 8 }}>
              <span className="sl-eyebrow">{d.pages.contents}</span>
              {doc.sections.map((s, i) => <a key={s.heading} href={`#${anchor(i)}`} style={{ font: "600 15px var(--font-body)", color: "var(--ink-700)" }}>{s.heading}</a>)}
            </nav>
          </aside>
          <article style={{ display: "grid", gap: 28, maxWidth: 760, minWidth: 0 }}>
            {doc.sections.map((s, i) => (
              <section key={s.heading} id={anchor(i)} style={{ display: "grid", gap: 12, scrollMarginTop: 96 }}>
                <h2 style={{ font: "var(--type-h3)" }}>{s.heading}</h2>
                {s.paragraphs?.map((p) => <p key={p} style={{ color: "var(--ink-800)", lineHeight: 1.7 }}><Text>{p}</Text></p>)}
                {s.bullets && (
                  <ul style={{ margin: 0, paddingInlineStart: 22, listStyle: "disc", display: "grid", gap: 8, color: "var(--ink-800)", lineHeight: 1.6 }}>
                    {s.bullets.map((b) => <li key={b}><Text>{b}</Text></li>)}
                  </ul>
                )}
              </section>
            ))}
            <nav aria-label={d.pages.otherPolicies} style={{ display: "grid", gap: 12, borderTop: "2px dashed var(--ink-100)", paddingTop: 24 }}>
              <span className="sl-eyebrow">{d.pages.otherPolicies}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(Object.keys(LEGAL_PATHS) as LegalSlug[]).filter((k) => k !== slug).map((k) => (
                  <Button key={k} variant="outline" size="sm" iconStart={ICONS[k]} href={LEGAL_PATHS[k]}>{docs[k].title}</Button>
                ))}
              </div>
            </nav>
          </article>
        </div>
      </section>
    </>
  );
}
