import Link from "next/link";
import { Badge, BlobFrame, Button, Card, FloatingDecor, Icon, Progress, SpeechBubble } from "@/components/storyling";
import { AutoRefresh } from "@/components/dashboard/ui/AutoRefresh";
import { ConfirmAction } from "@/components/dashboard/ui/ConfirmAction";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import { deleteCharacter } from "@/lib/characters/actions";
import type { CharacterDetail } from "@/lib/characters/queries";
import type { CatalogStyle } from "@/lib/catalog";
import type { Dictionary } from "@/i18n/dictionaries";
import { ApproveButton, RegenerateForm } from "./StudioActions";

function Portrait({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div style={{ aspectRatio: "2 / 3", borderRadius: "var(--radius-card-wobble)", overflow: "hidden", background: "var(--tint-sky)", boxShadow: "var(--shadow-sticker)", display: "grid", placeItems: "center" }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={url} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Icon name="user-circle" weight="duotone" size={96} color="var(--blue-400)" />
      )}
    </div>
  );
}

export function CharacterStudioView({ d, c, styles }: { d: Dictionary; c: CharacterDetail; styles: CatalogStyle[] }) {
  const t = d.characters;
  const generating = c.status === "generating";
  const latest = c.references.find((r) => r.id === c.latestReferenceId) ?? c.references[0];
  const approved = c.references.find((r) => r.id === c.approvedReferenceId);
  const shown = c.status === "approved" ? approved ?? latest : latest;
  const others = c.references.filter((r) => r.id !== shown?.id);

  return (
    <PageBody>
      <AutoRefresh active={generating} />
      <PageHeader back={{ href: "/dashboard/characters", label: t.title }} eyebrow={t.for(c.childName)}
        title={<span style={{ display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>{c.name}
          <Badge tone={c.status === "approved" ? "mint" : c.status === "failed" ? "cherry" : "sky"}>{t.status[c.status] ?? c.status}</Badge></span>}
        actions={<ConfirmAction action={deleteCharacter.bind(null, c.id)} label={t.delete} title={t.deleteTitle} body={t.deleteBody} confirmLabel={d.children.confirmDelete} cancelLabel={d.children.cancel} errors={d.errors} redirectTo="/dashboard/characters" />} />

      <div className="grid wide:grid-cols-[minmax(0,380px)_1fr] gap-8 items-start">
        <div style={{ position: "relative" }}>
          {generating ? (
            <Card tone="sun" wobble padding={28} style={{ overflow: "hidden", aspectRatio: "2 / 3", display: "grid", alignContent: "center", gap: 18, textAlign: "center" }}>
              <FloatingDecor preset="magic" />
              <Icon name="paint-brush-broad" weight="duotone" size={88} color="var(--ink-900)" className="sl-wiggle" style={{ justifySelf: "center", position: "relative" }} />
              <h2 style={{ font: "var(--type-h3)", position: "relative" }}>{t.drawing}</h2>
              <p style={{ position: "relative", color: "var(--ink-800)" }}>{t.drawingSub}</p>
              <Progress value={c.job?.progress ?? 5} tone="grape" style={{ position: "relative" }} />
            </Card>
          ) : (
            <Portrait url={shown?.url ?? null} alt={c.name} />
          )}
        </div>

        <div style={{ display: "grid", gap: 22 }}>
          {c.status === "failed" && (
            <Card tone="bubble" variant="flat" padding={20} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Icon name="warning-circle" size={26} color="var(--cherry-600)" /><p>{t.failed}</p>
            </Card>
          )}
          {c.status === "ready" && shown && (
            <Card tone="sky" padding={24} style={{ display: "grid", gap: 16 }}>
              <SpeechBubble tone="white" tail="none" style={{ boxShadow: "none" }}>{t.review}</SpeechBubble>
              <ApproveButton characterId={c.id} referenceId={shown.id} label={t.approve} errors={d.errors} />
            </Card>
          )}
          {c.status === "approved" && (
            <Card tone="mint" padding={24} style={{ display: "grid", gap: 16 }}>
              <p style={{ display: "flex", gap: 10, alignItems: "center", font: "var(--type-h4)", color: "var(--ink-900)" }}><Icon name="seal-check" color="var(--mint-600)" size={28} />{t.approved}</p>
              <div><Button size="lg" variant="secondary" iconStart="magic-wand" href={`/dashboard/create?child=${c.childId}&character=${c.id}`}>{t.createBook}</Button></div>
            </Card>
          )}
          {!generating && (
            <Card padding={24} style={{ display: "grid", gap: 14 }}>
              <h2 style={{ font: "var(--type-h4)", display: "flex", gap: 10, alignItems: "center" }}><Icon name="arrow-clockwise" color="var(--blue-500)" />{t.tryAgain}</h2>
              <p style={{ font: "var(--type-small)", color: "var(--ink-500)" }}>{t.attempts(c.generationCount)}</p>
              <RegenerateForm characterId={c.id} styles={styles.map((s) => ({ id: s.id, name: s.name }))} currentStyleId={c.styleId} errors={d.errors}
                labels={{ corrections: t.corrections, correctionsPlaceholder: t.correctionsPlaceholder, style: t.changeStyle, submit: t.tryAgain }} />
            </Card>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ font: "var(--type-h3)" }}>{t.history}</h2>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill,minmax(min(160px,44%),1fr))" }}>
            {others.map((r, i) => (
              <div key={r.id} style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                <BlobFrame src={r.url} alt="" shape={((i % 4) + 1) as 1 | 2 | 3 | 4} aspect="2/3" style={{ width: "100%" }} />
                {!generating && <ApproveButton characterId={c.id} referenceId={r.id} label={t.useThis} errors={d.errors} variant="outline" />}
              </div>
            ))}
          </div>
        </section>
      )}
      <p><Link href={`/dashboard/children/${c.childId}`}>{c.childName}</Link></p>
    </PageBody>
  );
}
