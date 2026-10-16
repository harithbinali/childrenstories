import Link from "next/link";
import { Badge, BlobFrame, Button, Card } from "@/components/storyling";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import type { CharacterCard } from "@/lib/characters/queries";
import type { Dictionary } from "@/i18n/dictionaries";

export function CharactersView({ d, items }: { d: Dictionary; items: CharacterCard[] }) {
  const t = d.characters;
  return (
    <PageBody>
      <PageHeader title={t.title} sub={t.sub} actions={<Button iconStart="user-circle-plus" href="/dashboard/children">{t.newTitle}</Button>} />
      {items.length === 0 ? (
        <Card tone="paper" variant="flat" padding={28}><p>{t.empty}</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,44%),1fr))" }}>
          {items.map((c, i) => (
            <Link key={c.id} href={`/dashboard/characters/${c.id}`} style={{ display: "grid", gap: 10, textDecoration: "none", color: "inherit", fontWeight: "inherit", transform: `rotate(${[-1, 1, -0.5, 0.8][i % 4]}deg)` }}>
              <BlobFrame src={c.imageUrl} alt={c.name} shape={((i % 4) + 1) as 1 | 2 | 3 | 4} tone={(["sky", "bubble", "sun", "grape"] as const)[i % 4]} icon="user-circle" label={t.status[c.status] ?? c.status} aspect="3/4" />
              <div style={{ display: "grid", gap: 4 }}>
                <b style={{ font: "var(--type-h4)", color: "var(--ink-900)" }}>{c.name}</b>
                {c.childName && <span style={{ font: "var(--type-small)", color: "var(--ink-500)" }}>{t.for(c.childName)}</span>}
                <span><Badge size="sm" tone={c.status === "approved" ? "mint" : c.status === "failed" ? "cherry" : "sky"}>{t.status[c.status] ?? c.status}</Badge></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageBody>
  );
}
