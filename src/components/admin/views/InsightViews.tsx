import Link from "next/link";
import type { Overview, Report } from "@/lib/admin/queries";
import { formatMoney } from "@/lib/payments/pricing";
import { formatDate, num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { AdminPage, Panel, Stat, StatGrid, Table, usd } from "../ui";

const money = (m: Record<string, number>, l: Locale) => Object.entries(m).map(([c, a]) => formatMoney(a, c, l)).join(" · ") || formatMoney(0, "USD", l);

export function OverviewView({ d, locale, o }: { d: Dictionary; locale: Locale; o: Overview | null }) {
  const t = d.admin.overview;
  if (!o) return <AdminPage title={t.title} sub={t.sub}><Panel tone="sun"><p>{t.unavailable}</p></Panel></AdminPage>;
  const n = (v: number) => num(v.toLocaleString("en"), locale);
  // Only USD can be compared with AI costs (billed in USD).
  const profit = ((o.revenue.USD ?? 0) - (o.refunds.USD ?? 0)) / 100 - Number(o.ai_cost_usd);
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <StatGrid>
        <Stat icon="users-three" label={t.parents} value={n(o.parents)} href="/admin/customers" />
        <Stat icon="baby" tone="bubble" label={t.children} value={n(o.children)} href="/admin/children" />
        <Stat icon="user-circle" tone="grape" label={t.characters} value={n(o.characters)} href="/admin/characters" />
        <Stat icon="books" tone="sun" label={t.books} value={n(o.books)} href="/admin/books" />
        <Stat icon="seal-check" tone="mint" label={t.paidBooks} value={n(o.paid_books)} href="/admin/orders" />
      </StatGrid>
      <StatGrid>
        <Stat icon="currency-circle-dollar" tone="mint" label={t.revenue} value={money(o.revenue, locale)} href="/admin/reports" />
        <Stat icon="arrow-u-up-left" tone="grape" label={t.refunds} value={money(o.refunds, locale)} href="/admin/refunds" />
        <Stat icon="magic-wand" tone="tangerine" label={t.aiCost} value={usd(o.ai_cost_usd, locale)} hint={o.ai_unpriced_calls ? t.unpricedCalls(o.ai_unpriced_calls) : `${t.aiCost24h}: ${usd(o.ai_cost_24h_usd, locale)}`} href="/admin/ai" />
        <Stat icon="chart-line-up" tone="sky" label={t.grossProfit} value={usd(profit, locale)} hint={t.grossProfitNote} />
      </StatGrid>
      <StatGrid>
        <Stat icon="hourglass-medium" label={t.pendingJobs} value={n(o.pending_jobs)} href="/admin/jobs?status=queued" />
        <Stat icon="warning-circle" tone="cherry" label={t.failedJobs} value={n(o.failed_jobs)} hint={t.failed24h(o.failed_jobs_24h)} href="/admin/jobs?status=failed" />
        <Stat icon="lifebuoy" tone="sun" label={t.openTickets} value={n(o.open_tickets)} href="/admin/support" />
        <Stat icon="user-minus" tone="bubble" label={t.pendingDeletions} value={n(o.pending_deletions)} href="/admin/customers?status=deletion_pending" />
      </StatGrid>
    </AdminPage>
  );
}

/** Horizontal bar list — readable at any width, no chart library. */
function Bars({ rows, value, label, format }: { rows: Report["days"]; value: (r: Report["days"][number]) => number; label: (r: Report["days"][number]) => string; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {rows.map((r) => (
        <div key={r.day} style={{ display: "grid", gridTemplateColumns: "88px 1fr minmax(64px, auto)", gap: 10, alignItems: "center", font: "var(--type-caption)" }}>
          <span style={{ color: "var(--ink-500)", whiteSpace: "nowrap" }}>{label(r)}</span>
          <span style={{ height: 12, borderRadius: 99, background: "var(--ink-100)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(value(r) / max) * 100}%`, background: "var(--blue-500)", borderRadius: 99 }} />
          </span>
          <span style={{ textAlign: "end", fontWeight: 700, color: "var(--ink-800)" }}>{format(value(r))}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportsView({ d, locale, r, days }: { d: Dictionary; locale: Locale; r: Report | null; days: number }) {
  const t = d.admin.reports;
  const ranges = [7, 30, 90, 365];
  if (!r) return <AdminPage title={t.title} sub={t.sub}><Panel tone="sun"><p>{d.admin.overview.unavailable}</p></Panel></AdminPage>;
  const rows = r.days.slice(-31); // daily bars for up to a month; totals cover the full range
  const sum = (k: "sales" | "revenue_usd" | "refunds_usd" | "ai_cost_usd" | "new_customers") => r.days.reduce((a, x) => a + Number(x[k]), 0);
  const day = (x: { day: string }) => formatDate(x.day, locale);
  const cents = (v: number) => formatMoney(v, "USD", locale);
  const conversion = r.checkouts.started ? Math.round((r.checkouts.paid / r.checkouts.started) * 100) : 0;
  return (
    <AdminPage title={t.title} sub={t.sub}
      actions={<nav aria-label={t.range} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ranges.map((n) => (
        <Link key={n} href={`?days=${n}`} className={`sl-btn sl-btn--sm ${n === days ? "sl-btn--secondary" : "sl-btn--outline"}`} aria-current={n === days ? "page" : undefined}>{t.days(n)}</Link>
      ))}</nav>}>
      <StatGrid>
        <Stat icon="shopping-bag" label={t.sales} value={num(sum("sales"), locale)} />
        <Stat icon="currency-circle-dollar" tone="mint" label={t.revenue} value={cents(sum("revenue_usd"))} />
        <Stat icon="arrow-u-up-left" tone="grape" label={t.refunds} value={cents(sum("refunds_usd"))} />
        <Stat icon="magic-wand" tone="tangerine" label={t.aiCost} value={usd(sum("ai_cost_usd"), locale)} />
        <Stat icon="user-plus" tone="bubble" label={t.growth} value={num(sum("new_customers"), locale)} />
      </StatGrid>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))", alignItems: "start" }}>
        <Panel title={t.revenue}><Bars rows={rows} value={(x) => Number(x.revenue_usd)} label={day} format={cents} /></Panel>
        <Panel title={t.sales}><Bars rows={rows} value={(x) => Number(x.sales)} label={day} format={(v) => num(v, locale)} /></Panel>
        <Panel title={t.aiCost}><Bars rows={rows} value={(x) => Number(x.ai_cost_usd)} label={day} format={(v) => usd(v, locale)} /></Panel>
        <Panel title={t.growth}><Bars rows={rows} value={(x) => Number(x.new_customers)} label={day} format={(v) => num(v, locale)} /></Panel>
        <Panel title={t.themes}>
          <Table rowKey={(x) => x.slug} rows={r.themes} empty={d.admin.common.empty} columns={[
            { label: t.theme, cell: (x) => (locale === "ar" ? x.name_ar : x.name_en) },
            { label: t.booksMade, cell: (x) => num(x.books, locale), align: "end" },
            { label: t.booksPaid, cell: (x) => num(x.paid, locale), align: "end" },
          ]} />
        </Panel>
        <Panel title={t.paymentPerformance}>
          <StatGrid>
            <Stat icon="cursor-click" label={t.checkoutsStarted} value={num(r.checkouts.started, locale)} />
            <Stat icon="seal-check" tone="mint" label={t.checkoutsPaid} value={num(r.checkouts.paid, locale)} hint={`${t.conversion}: ${num(conversion, locale)}%`} />
          </StatGrid>
          <Table rowKey={(x) => `${x.gateway}-${x.status}-${x.currency}`} rows={r.payments} empty={d.admin.common.empty} columns={[
            { label: d.admin.orders.gateway, cell: (x) => x.gateway },
            { label: d.admin.common.status, cell: (x) => d.orders.status[x.status] ?? x.status },
            { label: t.total, cell: (x) => num(x.count, locale), align: "end" },
            { label: d.admin.common.amount, cell: (x) => formatMoney(Number(x.amount), x.currency, locale), align: "end", nowrap: true },
          ]} />
        </Panel>
      </div>
    </AdminPage>
  );
}
