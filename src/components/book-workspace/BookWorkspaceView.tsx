import type { ReactNode } from "react";
import { Badge, Button, Card, FloatingDecor, Icon, Progress, Toast } from "@/components/storyling";
import { BookPage } from "@/components/book/BookPage";
import { AutoRefresh } from "@/components/dashboard/ui/AutoRefresh";
import { ConfirmAction } from "@/components/dashboard/ui/ConfirmAction";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import { deleteBook } from "@/lib/books/actions";
import type { BookWorkspace } from "@/lib/books/queries";
import { formatMoney } from "@/lib/payments/pricing";
import { aspectRatio, buildPageSequence } from "@/lib/book/layout-spec";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { CheckoutPanel } from "./CheckoutPanel";
import { FavoriteButton, RedrawButton, RetryStoryButton } from "./BookActions";
import { StoryEditor } from "./StoryEditor";

const WORKING = new Set(["story_generating", "illustrating", "producing"]);

function Working({ icon, title, sub, progress, children }: { icon: string; title: string; sub: string; progress?: number; children?: ReactNode }) {
  return (
    <Card tone="sun" wobble padding="clamp(24px,4vw,40px)" style={{ overflow: "hidden", display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
      <FloatingDecor preset="magicEdge" />
      <Icon name={icon} weight="duotone" size={88} color="var(--ink-900)" className="sl-wiggle" style={{ position: "relative" }} />
      <h2 style={{ font: "var(--type-h2)", position: "relative" }}>{title}</h2>
      <p style={{ position: "relative", maxWidth: 520, color: "var(--ink-800)" }}>{sub}</p>
      {progress !== undefined && <Progress value={progress} tone="grape" style={{ position: "relative", width: "min(420px, 100%)" }} />}
      {children}
    </Card>
  );
}

/** One page tile at the book's real aspect ratio, using the shared BookPage layout. */
function PageTile({ b, kind, text, textPosition, imageUrl, pageNumber, locked, footer }: {
  b: BookWorkspace; kind: "front_cover" | "dedication" | "story" | "back_cover"; text?: string; textPosition?: BookWorkspace["pages"][number]["textPosition"];
  imageUrl: string | null; pageNumber?: number; locked?: string; footer?: ReactNode;
}) {
  return (
    <figure style={{ margin: 0, display: "grid", gap: 10, justifyItems: "center" }}>
      <div style={{ width: "100%", aspectRatio: `${aspectRatio(b.orientation)}`, borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-card)", position: "relative" }}>
        <BookPage kind={kind} orientation={b.orientation} language={b.language} ageRange={b.ageRange} text={text} textPosition={textPosition}
          title={kind === "front_cover" ? b.title ?? "" : undefined} pageNumber={pageNumber ?? null} imageUrl={imageUrl}
          art={!imageUrl && kind !== "dedication" ? (
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(-45deg, var(--paper-2) 0 14px, var(--paper) 14px 28px)", display: "grid", placeItems: "center", paddingBottom: "28%" }}>
              {locked && <span style={{ display: "inline-flex", gap: 8, alignItems: "center", font: "700 13px var(--font-body)", color: "var(--ink-500)", background: "var(--white)", padding: "8px 12px", borderRadius: 999 }}><Icon name="lock-simple" />{locked}</span>}
            </div>
          ) : undefined} />
      </div>
      {footer}
    </figure>
  );
}

export function BookWorkspaceView({ d, locale, b, payment }: { d: Dictionary; locale: Locale; b: BookWorkspace; payment?: string }) {
  const t = d.book;
  const statusLabel = d.dashboard.status[b.status] ?? b.status;
  const price = b.price ? formatMoney(b.price.amount, b.price.currency, locale) : null;
  const working = WORKING.has(b.status) || b.jobs.storyRunning || b.jobs.rewritingPages.length > 0 || b.jobs.illustratingPages.length > 0 || b.jobs.pdfRunning;
  const redrawsLeft = Math.max(0, b.usage.included - b.usage.textRedrawsUsed);
  const tileGrid = { display: "grid", gap: 22, gridTemplateColumns: `repeat(auto-fill,minmax(min(${b.orientation === "portrait" ? 200 : 280}px,100%),1fr))` };

  return (
    <PageBody>
      <AutoRefresh active={working || payment === "success" || payment === "processing"} />
      <PageHeader back={{ href: "/dashboard/books", label: d.books.all }} eyebrow={b.childName ? t.forChild(b.childName) : undefined}
        title={<span style={{ display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>{b.title ?? d.dashboard.untitled}
          <Badge tone={b.status === "completed" ? "mint" : b.status === "failed" ? "cherry" : "sky"}>{statusLabel}</Badge>
          {b.entitled && <Badge tone="mint" variant="soft" icon="seal-check">{d.dashboard.paid}</Badge>}</span>}
        actions={<>
          <FavoriteButton bookId={b.id} favorite={b.isFavorite} labels={{ on: t.favorite, off: t.unfavorite }} />
          {b.status !== "producing" && <ConfirmAction action={deleteBook.bind(null, b.id)} label={t.delete} title={t.deleteTitle} body={t.deleteBody} confirmLabel={d.children.confirmDelete} cancelLabel={d.children.cancel} errors={d.errors} redirectTo="/dashboard/books" />}
        </>} />

      {payment === "cancelled" && <Toast tone="sky" title={t.paymentCancelled} />}
      {(payment === "processing" || (payment === "success" && !b.entitled)) && <Toast tone="sun" icon="hourglass-medium" title={t.paymentProcessing} />}

      {b.status === "story_generating" && <Working icon="pencil-line" title={t.writingTitle} sub={t.writingSub} progress={30} />}

      {b.status === "failed" && (
        <Card tone="bubble" padding={28} style={{ display: "grid", gap: 14, justifyItems: "start" }}>
          <h2 style={{ font: "var(--type-h3)" }}>{t.failedTitle}</h2><p>{t.failedSub}</p>
          <RetryStoryButton bookId={b.id} label={t.retry} errors={d.errors} />
        </Card>
      )}

      {b.status === "story_ready" && (
        <section style={{ display: "grid", gap: 18 }}>
          <div><h2 style={{ font: "var(--type-h3)" }}>{t.editTitle}</h2><p style={{ color: "var(--ink-700)" }}>{t.editSub}</p></div>
          <StoryEditor bookId={b.id} title={b.title ?? ""} pages={b.pages.map((p) => ({ number: p.number, text: p.text }))} rewritingPages={b.jobs.rewritingPages}
            errors={d.errors} mode="draft"
            labels={{ titleLabel: t.titleLabel, pageLabels: Object.fromEntries(b.pages.map((p) => [p.number, t.page(p.number)])), save: t.save, saved: t.saved, rewrite: t.rewrite,
              rewriteHint: t.rewriteHint, rewriting: t.rewriting, newDraft: t.newDraft, approve: t.approve, redrawsLeft: t.redrawsLeft(redrawsLeft) }} />
        </section>
      )}

      {(b.status === "story_approved" || b.status === "illustrating") && (
        <Working icon="paint-brush-broad" title={t.illustratingTitle} sub={t.illustratingSub} progress={50} />
      )}

      {b.status === "producing" && (
        <Working icon="sparkle" title={t.producingTitle} sub={t.producingSub} progress={Math.round((b.jobs.finalDone / b.jobs.finalTotal) * 100)}>
          <p style={{ position: "relative", font: "700 15px var(--font-body)" }}>{b.jobs.pdfRunning ? t.bindingPdf : t.pagesDone(Math.min(b.jobs.finalDone, b.jobs.finalTotal), b.jobs.finalTotal)}</p>
        </Working>
      )}

      {b.status === "completed" && (
        <Card tone="mint" wobble padding="clamp(22px,3vw,32px)" style={{ overflow: "hidden", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <FloatingDecor preset="magicEdge" />
          <div style={{ position: "relative", display: "grid", gap: 8 }}>
            <h2 style={{ font: "var(--type-h2)" }}>{t.readyTitle}</h2>
            <p style={{ font: "var(--type-small)", color: "var(--ink-700)" }}>{t.redrawsUsed(b.usage.imageRedrawsUsed, b.usage.included)}</p>
          </div>
          <div style={{ position: "relative", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button size="lg" variant="secondary" iconStart="book-open" href={`/dashboard/books/${b.id}/read`}>{b.readingPage > 0 ? t.continueReading : t.read}</Button>
            {b.pdfReady && !b.jobs.pdfRunning ? (
              <Button size="lg" variant="outline" iconStart="download-simple" href={`/api/books/${b.id}/pdf`}>{t.download}</Button>
            ) : (
              <Button size="lg" variant="outline" iconStart="spinner-gap" disabled>{t.pdfUpdating}</Button>
            )}
          </div>
        </Card>
      )}

      {["preview_ready", "producing", "completed"].includes(b.status) && (
        <div className={`grid gap-8 items-start ${b.status === "preview_ready" ? "wide:grid-cols-[1fr_minmax(0,420px)]" : ""}`}>
          <section style={{ display: "grid", gap: 16, minWidth: 0 }}>
            {b.status === "preview_ready" && <div><h2 style={{ font: "var(--type-h3)" }}>{t.previewTitle}</h2><p style={{ color: "var(--ink-700)" }}>{t.previewSub}</p></div>}
            <div style={tileGrid}>
              {buildPageSequence(b.pageCount, Boolean(b.dedication)).map((s) => {
                const final = b.status !== "preview_ready";
                if (s.kind === "front_cover") {
                  const url = (final ? b.cover.finalUrl : null) ?? b.cover.previewUrl;
                  return <PageTile key="cover" b={b} kind="front_cover" imageUrl={url} locked={b.entitled ? t.pagePending : t.previewLocked}
                    footer={(b.status === "preview_ready" || b.status === "completed") && <RedrawButton bookId={b.id} kind="front_cover" label={t.redraw} busyLabel={t.redrawing} errors={d.errors} />} />;
                }
                if (s.kind === "dedication") return <PageTile key="ded" b={b} kind="dedication" text={b.dedication ?? ""} imageUrl={null} />;
                if (s.kind === "back_cover") return final ? <PageTile key="back" b={b} kind="back_cover" imageUrl={b.backCover.finalUrl} locked={b.entitled ? t.pagePending : t.previewLocked} /> : null;
                const p = b.pages.find((x) => x.number === s.storyPageNumber)!;
                const url = (final ? p.finalUrl : null) ?? p.previewUrl;
                const busy = b.jobs.illustratingPages.includes(p.number);
                const canRedraw = b.status === "completed" || (b.status === "preview_ready" && Boolean(p.previewUrl));
                return <PageTile key={p.number} b={b} kind="story" text={p.text} textPosition={p.textPosition} imageUrl={url} pageNumber={p.number} locked={b.entitled ? t.pagePending : t.previewLocked}
                  footer={canRedraw && <RedrawButton bookId={b.id} kind="page" pageNumber={p.number} label={t.redraw} busyLabel={t.redrawing} errors={d.errors} busy={busy} />} />;
              })}
            </div>
          </section>
          {b.status === "preview_ready" && price && (
            <div style={{ position: "sticky", top: 24 }}>
              <CheckoutPanel bookId={b.id} price={price} gateways={b.gateways} errors={d.errors}
                labels={{ title: t.checkoutTitle, includes: t.includes, payWith: t.payWith, card: t.card, discount: t.discount, buy: t.buy(price), redirecting: t.redirecting, paymentsOff: t.paymentsOff }} />
            </div>
          )}
        </div>
      )}

      {b.status === "completed" && (
        <details>
          <summary style={{ cursor: "pointer", font: "var(--type-h4)", color: "var(--ink-900)" }}>{t.editTitle}</summary>
          <div style={{ marginTop: 16 }}>
            <StoryEditor bookId={b.id} title={b.title ?? ""} pages={b.pages.map((p) => ({ number: p.number, text: p.text }))} rewritingPages={[]} errors={d.errors} mode="completed"
              labels={{ titleLabel: t.titleLabel, pageLabels: Object.fromEntries(b.pages.map((p) => [p.number, t.page(p.number)])), save: t.save, saved: t.saved, rewrite: t.rewrite,
                rewriteHint: t.rewriteHint, rewriting: t.rewriting, newDraft: t.newDraft, approve: t.approve, redrawsLeft: "" }} />
          </div>
        </details>
      )}
      <p style={{ font: "var(--type-caption)", color: "var(--ink-400)" }}>{d.common.pages(b.pageCount)} · {num(b.ageRange.replace("-", "–"), locale)} · {b.orientation === "portrait" ? d.creator.portrait : d.creator.landscape}</p>
    </PageBody>
  );
}
