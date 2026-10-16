import Link from "next/link";
import { Avatar, Badge, BlobFrame, Button, Card, Icon, StoryCard } from "@/components/storyling";
import { ConfirmAction } from "@/components/dashboard/ui/ConfirmAction";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import { CharacterCreateForm } from "@/components/characters/CharacterCreateForm";
import { deleteChild, deleteChildPhoto } from "@/lib/children/actions";
import type { ChildDetail } from "@/lib/children/queries";
import type { CatalogStyle } from "@/lib/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ChildForm } from "./ChildForm";
import { childFormLabels } from "./labels";
import { PhotoUploader } from "./PhotoUploader";

export function ChildDetailView({ d, locale, child, styles }: { d: Dictionary; locale: Locale; child: ChildDetail; styles: CatalogStyle[] }) {
  const t = d.children;
  const c = d.characters;
  return (
    <PageBody>
      <PageHeader back={{ href: "/dashboard/children", label: t.title }} title={<span style={{ display: "inline-flex", gap: 14, alignItems: "center" }}><Avatar name={child.display_name} tone="bubble" size={56} />{child.display_name}</span>}
        actions={<ConfirmAction action={deleteChild.bind(null, child.id)} label={t.delete} title={t.deleteTitle} body={t.deleteBody} confirmLabel={t.confirmDelete} cancelLabel={t.cancel} errors={d.errors} redirectTo="/dashboard/children" />} />

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))", alignItems: "start" }}>
        <Card padding="clamp(22px,3vw,30px)">
          <h2 style={{ font: "var(--type-h3)", marginBottom: 18 }}>{t.editTitle}</h2>
          <ChildForm labels={childFormLabels(t)} errors={d.errors} initial={child} defaultLanguage={locale} />
        </Card>

        <Card tone="sky" padding="clamp(22px,3vw,30px)" style={{ display: "grid", gap: 16 }}>
          <h2 style={{ font: "var(--type-h3)" }}>{t.photos}</h2>
          <p style={{ color: "var(--ink-700)", font: "var(--type-small)" }}>{t.photosSub}</p>
          {child.photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {child.photos.map((p, i) => (
                <div key={p.id} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <BlobFrame src={p.url} alt="" shape={((i % 4) + 1) as 1 | 2 | 3 | 4} aspect="1/1" style={{ width: "100%" }} />
                  <ConfirmAction action={deleteChildPhoto.bind(null, p.id)} label={t.photoRemove} title={t.photoRemove} body="" confirmLabel={t.confirmDelete} cancelLabel={t.cancel} errors={d.errors} icon="x" variant="ghost" />
                </div>
              ))}
            </div>
          )}
          {child.photos.length < 3 && (
            <PhotoUploader childId={child.id} errors={d.errors} labels={{ add: t.photoAdd, choose: t.photoChoose, uploading: t.photoUploading, guardian: t.guardian, tips: t.photoTips }} />
          )}
        </Card>
      </div>

      <section style={{ display: "grid", gap: 18 }}>
        <h2 style={{ font: "var(--type-h3)" }}>{t.characters}</h2>
        {child.characters.length > 0 && (
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,44%),1fr))" }}>
            {child.characters.map((ch, i) => (
              <Link key={ch.id} href={`/dashboard/characters/${ch.id}`} style={{ display: "grid", gap: 10, textDecoration: "none", color: "inherit", fontWeight: "inherit" }}>
                <BlobFrame src={ch.imageUrl} alt={ch.name} shape={((i % 4) + 1) as 1 | 2 | 3 | 4} tone="bubble" icon="user-circle" label={c.status[ch.status] ?? ch.status} aspect="3/4" />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ font: "var(--type-h4)", color: "var(--ink-900)" }}>{ch.name}</b>
                  <Badge size="sm" tone={ch.status === "approved" ? "mint" : ch.status === "failed" ? "cherry" : "sky"}>{c.status[ch.status] ?? ch.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Card tone="paper" variant="flat" padding="clamp(22px,3vw,30px)" style={{ maxWidth: 760 }}>
          <h3 style={{ font: "var(--type-h4)", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}><Icon name="magic-wand" color="var(--grape-500)" />{c.newTitle}</h3>
          {child.photos.length === 0 ? (
            <p style={{ color: "var(--ink-700)" }}>{t.needPhoto}</p>
          ) : (
            <CharacterCreateForm childId={child.id} defaultName={child.display_name} styles={styles} labels={{ name: c.nameLabel, style: c.styleLabel, corrections: c.correctionsLabel, correctionsPlaceholder: c.correctionsPlaceholder, create: c.create }} errors={d.errors} />
          )}
        </Card>
      </section>

      {child.books.length > 0 && (
        <section style={{ display: "grid", gap: 18 }}>
          <h2 style={{ font: "var(--type-h3)" }}>{t.books}</h2>
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,44%),1fr))" }}>
            {child.books.map((b) => (
              <StoryCard key={b.id} href={`/dashboard/books/${b.id}`} title={b.title ?? d.dashboard.untitled} pages={d.common.pages(b.pageCount)} badge={d.dashboard.status[b.status]} badgeTone="sky" />
            ))}
          </div>
        </section>
      )}
      <div><Button variant="secondary" iconStart="magic-wand" href={`/dashboard/create?child=${child.id}`}>{c.createBook}</Button></div>
    </PageBody>
  );
}
