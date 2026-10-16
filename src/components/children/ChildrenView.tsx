import Link from "next/link";
import { Avatar, AVATAR_TONES, Card, Icon } from "@/components/storyling";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import type { ChildSummary } from "@/lib/children/queries";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ChildForm } from "./ChildForm";
import { childFormLabels } from "./labels";

export function ChildrenView({ d, locale, kids, showForm }: { d: Dictionary; locale: Locale; kids: ChildSummary[]; showForm: boolean }) {
  const t = d.children;
  return (
    <PageBody>
      <PageHeader title={t.title} sub={t.sub} />
      {kids.length > 0 && (
        <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))" }}>
          {kids.map((k, i) => (
            <Card key={k.id} as={Link} href={`/dashboard/children/${k.id}`} interactive wobble tone={(["sun", "sky", "bubble", "mint", "grape", "tangerine"] as const)[i % 6]}
              tilt={[-1, 1, -0.5, 0.8][i % 4]} style={{ display: "grid", gap: 12, textDecoration: "none", color: "inherit", fontWeight: "inherit" }}>
              <Avatar name={k.name} tone={AVATAR_TONES[i % AVATAR_TONES.length]} size={64} />
              <h2 style={{ font: "var(--type-h3)" }}>{k.name}</h2>
              {k.ageYears !== null && <p style={{ color: "var(--ink-700)", fontWeight: 600 }}>{t.yearsOld(k.ageYears)}</p>}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", font: "700 13px var(--font-body)", color: "var(--ink-700)" }}>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon name="camera" />{num(k.photoCount, locale)}</span>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon name="user-circle" />{num(k.characterCount, locale)}</span>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon name="books" />{num(k.bookCount, locale)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {kids.length === 0 && <p style={{ color: "var(--ink-700)" }}>{t.empty}</p>}
      <Card id="add" padding="clamp(22px,3vw,32px)" style={{ maxWidth: 720 }}>
        <details open={showForm || kids.length === 0}>
          <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 12, font: "var(--type-h3)", color: "var(--ink-900)" }}>
            <span style={{ width: 44, height: 44, borderRadius: 16, background: "var(--sun-400)", display: "grid", placeItems: "center", transform: "rotate(-6deg)" }}><Icon name="plus" weight="bold" /></span>
            {t.addTitle}
          </summary>
          <div style={{ marginTop: 22 }}>
            <ChildForm labels={childFormLabels(t)} errors={d.errors} defaultLanguage={locale} />
          </div>
        </details>
      </Card>
    </PageBody>
  );
}
