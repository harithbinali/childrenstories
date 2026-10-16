import Link from "next/link";
import { Badge, Button, Card, Icon, type BadgeTone } from "@/components/storyling";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import type { OrderRow } from "@/lib/account/queries";
import { formatMoney } from "@/lib/payments/pricing";
import { formatDate, num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

const STATUS_TONE: Record<string, BadgeTone> = { paid: "mint", refunded: "grape", partially_refunded: "grape", failed: "cherry", pending: "sun", processing: "sky" };

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, font: strong ? "800 16px var(--font-body)" : "var(--type-small)", color: tone ?? "var(--ink-900)" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

export function OrdersView({ d, locale, orders }: { d: Dictionary; locale: Locale; orders: OrderRow[] }) {
  const t = d.orders;
  const money = (n: number, c: string) => formatMoney(n, c, locale);
  return (
    <PageBody>
      <PageHeader title={t.title} sub={t.sub} />
      {orders.length === 0 ? (
        <Card tone="paper" variant="flat" padding={28} style={{ display: "grid", gap: 16, justifyItems: "start" }}>
          <p>{t.empty}</p>
          <Button iconStart="magic-wand" href="/dashboard/create">{d.books.create}</Button>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {orders.map((o) => (
            <Card key={o.id} padding="clamp(18px,3vw,26px)" style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                  <span aria-hidden style={{ width: 48, height: 48, borderRadius: 16, background: "var(--tint-sun)", display: "grid", placeItems: "center", flex: "none" }}>
                    <Icon name="receipt" weight="duotone" size={26} color="var(--ink-900)" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ font: "var(--type-h4)" }}>{t.order(num(o.orderNumber, locale))}</h2>
                    <p style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>
                      {t.placed} {formatDate(o.createdAt, locale)}{o.paidAt && <> · {t.paidOn} {formatDate(o.paidAt, locale)}</>}
                      {o.gateway && <> · {t.via[o.gateway] ?? o.gateway}</>}
                    </p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[o.status] ?? "ink"} variant="soft">{t.status[o.status] ?? o.status}</Badge>
              </div>

              <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", alignItems: "start" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <span className="sl-label">{t.book}</span>
                  {o.bookId ? (
                    <Link href={`/dashboard/books/${o.bookId}`} style={{ display: "inline-flex", gap: 8, alignItems: "center", font: "700 16px var(--font-body)", width: "fit-content" }}>
                      <Icon name="book-open" />{o.bookTitle ?? d.dashboard.untitled}
                    </Link>
                  ) : <span style={{ color: "var(--ink-500)" }}>{t.deletedBook}</span>}
                  {o.items.map((i, k) => (
                    <span key={k} style={{ font: "var(--type-small)", color: "var(--ink-700)" }}>{i.description} · {d.common.pages(i.pageCount)}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8, background: "var(--paper)", borderRadius: 20, padding: 16 }}>
                  <Line label={t.subtotal} value={money(o.subtotal, o.currency)} />
                  {o.discount > 0 && <Line label={t.discount} value={`−${money(o.discount, o.currency)}`} tone="var(--mint-600)" />}
                  <Line label={t.total} value={money(o.total, o.currency)} strong />
                  {o.refunds.filter((r) => r.status === "succeeded").map((r, k) => (
                    <Line key={k} label={t.refundOn(formatDate(r.createdAt, locale))} value={`−${money(r.amount, o.currency)}`} tone="var(--grape-600)" />
                  ))}
                  {o.refunded > 0 && <Line label={t.refunded} value={money(o.refunded, o.currency)} strong tone="var(--grape-600)" />}
                </div>
              </div>
            </Card>
          ))}
          <Card tone="sky" variant="flat" padding={22} style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <p style={{ fontWeight: 700 }}>{t.help}</p>
            <Button variant="outline" size="sm" iconStart="lifebuoy" href="/dashboard/support/new?category=order">{t.helpCta}</Button>
          </Card>
        </div>
      )}
    </PageBody>
  );
}
