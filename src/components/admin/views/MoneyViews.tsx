import Link from "next/link";
import { Checkbox, Input } from "@/components/storyling";
import type { OrderDetail, listOrders, listPayments, listRefunds, listWebhookEvents } from "@/lib/admin/queries";
import { issueRefund } from "@/lib/admin/actions";
import { toDecimalString } from "@/lib/payments/money";
import { formatMoney } from "@/lib/payments/pricing";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ActionForm } from "../forms";
import { AdminPage, KeyValues, Mono, Pager, Panel, StatusBadge, Table, Toolbar, shortId, when } from "../ui";

type Params = Record<string, string | undefined>;
const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed", "cancelled", "refunded", "partially_refunded"];

type Orders = Awaited<ReturnType<typeof listOrders>>;
export function OrdersAdminView({ d, locale, data, params }: { d: Dictionary; locale: Locale; data: Orders; params: Params }) {
  const t = d.admin.orders;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} placeholder={`# / ${t.customer} / ID`} filters={[{ name: "status", label: d.admin.common.status, options: PAYMENT_STATUSES.map((s) => ({ value: s, label: d.orders.status[s] ?? s })) }]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: t.number, cell: (r) => <Link href={`/admin/orders/${r.id}`} style={{ fontWeight: 700 }}>#{num(r.order_number, locale)}</Link>, nowrap: true },
        { label: t.customer, cell: (r) => (r.owner_id ? <Link href={`/admin/customers/${r.owner_id}`} dir="ltr">{r.customer_email ?? shortId(r.owner_id)}</Link> : <span dir="ltr">{r.customer_email ?? "—"}</span>) },
        { label: t.book, cell: (r) => (r.books as unknown as { title: string | null } | null)?.title ?? "—" },
        { label: d.admin.common.status, cell: (r) => <StatusBadge status={r.status} label={d.orders.status[r.status]} /> },
        { label: t.gateway, cell: (r) => r.gateway ?? "—" },
        { label: t.total, cell: (r) => formatMoney(r.total_amount, r.currency, locale), align: "end", nowrap: true },
        { label: t.refunded, cell: (r) => (r.refunded_amount ? formatMoney(r.refunded_amount, r.currency, locale) : "—"), align: "end", nowrap: true },
        { label: d.admin.common.created, cell: (r) => when(r.created_at, locale), nowrap: true },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}

export function OrderDetailView({ d, locale, o, isAdmin, gatewayConfigured }: { d: Dictionary; locale: Locale; o: OrderDetail; isAdmin: boolean; gatewayConfigured: boolean }) {
  const t = d.admin.orders;
  const common = d.admin.common;
  const m = (n: number) => formatMoney(n, o.currency, locale);
  const refundable = ["paid", "partially_refunded"].includes(o.status) && o.total_amount - o.refunded_amount > 0;
  const remaining = o.total_amount - o.refunded_amount;
  return (
    <AdminPage back={{ href: "/admin/orders", label: t.title }} title={`${t.number} #${num(o.order_number, locale)}`}>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(380px,100%),1fr))", alignItems: "start" }}>
        <Panel title={common.details}>
          <KeyValues items={[
            [common.id, <Mono key="id">{o.id}</Mono>], [common.status, <StatusBadge key="s" status={o.status} label={d.orders.status[o.status]} />],
            [t.customer, o.owner_id ? <Link key="c" href={`/admin/customers/${o.owner_id}`} dir="ltr">{o.customer_email ?? shortId(o.owner_id)}</Link> : <span dir="ltr">{o.customer_email ?? "—"}</span>],
            [t.book, o.books ? <Link key="b" href={`/admin/books?q=${o.books.id}`}>{o.books.title ?? d.dashboard.untitled}</Link> : "—"],
            [t.gateway, o.gateway ?? "—"], [common.created, when(o.created_at, locale)], [t.paidAt, when(o.paid_at, locale)],
            [d.orders.subtotal, m(o.subtotal_amount)], [d.orders.discount, o.discount_amount ? `−${m(o.discount_amount)}` : "—"],
            [t.total, <b key="t">{m(o.total_amount)}</b>], [t.refunded, o.refunded_amount ? m(o.refunded_amount) : "—"],
          ]} />
        </Panel>
        <Panel title={t.refundTitle} tone="paper">
          {!isAdmin ? <p style={{ color: "var(--ink-500)" }}>{d.admin.adminOnly}</p>
            : !refundable ? <p style={{ color: "var(--ink-700)" }}>{t.notRefundable}</p>
            : !gatewayConfigured ? <p style={{ color: "var(--cherry-600)", fontWeight: 700 }}>{t.gatewayNotConfigured}</p>
            : (
              <ActionForm action={issueRefund.bind(null, o.id)} submit={t.refundCta} saved={common.saved} errors={d.errors} variant="cherry" icon="arrow-u-up-left">
                <Input name="amount" label={t.refundAmount} hint={t.refundMax(m(remaining))} inputMode="decimal" required defaultValue={toDecimalString(remaining, o.currency)} dir="ltr" />
                <Input name="reason" label={t.refundReason} required maxLength={500} />
                <Checkbox name="confirm" required label={t.refundNote} />
              </ActionForm>
            )}
        </Panel>
        <Panel title={t.items}>
          <Table rowKey={(i) => i.description + i.page_count} rows={o.order_items} empty={common.empty} columns={[
            { label: t.items, cell: (i) => `${i.description} · ${d.common.pages(i.page_count)}` },
            { label: common.amount, cell: (i) => formatMoney(i.unit_amount * i.quantity, i.currency, locale), align: "end", nowrap: true },
          ]} />
        </Panel>
        <Panel title={t.payments}>
          <Table rowKey={(p) => p.id} rows={o.payments} empty={common.empty} columns={[
            { label: d.admin.payments.paymentId, cell: (p) => <Mono>{p.gateway}:{p.gateway_payment_id}</Mono> },
            { label: common.status, cell: (p) => <StatusBadge status={p.status} label={d.orders.status[p.status]} /> },
            { label: common.amount, cell: (p) => formatMoney(p.amount, p.currency, locale), align: "end", nowrap: true },
            { label: d.admin.payments.failure, cell: (p) => p.failure_reason ?? "—" },
          ]} />
        </Panel>
        <Panel title={t.refunds}>
          <Table rowKey={(r) => r.id} rows={o.refunds} empty={common.empty} columns={[
            { label: common.date, cell: (r) => when(r.created_at, locale), nowrap: true },
            { label: common.status, cell: (r) => <StatusBadge status={r.status} label={d.admin.refunds.status[r.status]} /> },
            { label: common.amount, cell: (r) => formatMoney(r.amount, r.currency, locale), align: "end", nowrap: true },
            { label: d.admin.refunds.reason, cell: (r) => r.reason ?? "—" },
          ]} />
        </Panel>
      </div>
    </AdminPage>
  );
}

type Payments = Awaited<ReturnType<typeof listPayments>>;
type Events = Awaited<ReturnType<typeof listWebhookEvents>>;
export function PaymentsAdminView({ d, locale, data, params, events, isAdmin }: { d: Dictionary; locale: Locale; data: Payments; params: Params; events: Events; isAdmin: boolean }) {
  const t = d.admin.payments;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} search={false} filters={[
        { name: "status", label: d.admin.common.status, options: PAYMENT_STATUSES.map((s) => ({ value: s, label: d.orders.status[s] ?? s })) },
        { name: "type", label: d.admin.orders.gateway, options: [{ value: "stripe", label: "Stripe" }, { value: "paypal", label: "PayPal" }] },
      ]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: d.admin.common.date, cell: (r) => when(r.created_at, locale), nowrap: true },
        { label: d.admin.orders.number, cell: (r) => <Link href={`/admin/orders/${r.order_id}`}>#{num((r.orders as unknown as { order_number: number } | null)?.order_number ?? 0, locale)}</Link> },
        { label: d.admin.orders.gateway, cell: (r) => r.gateway },
        { label: t.paymentId, cell: (r) => <Mono>{r.gateway_payment_id}</Mono> },
        { label: d.admin.common.status, cell: (r) => <StatusBadge status={r.status} label={d.orders.status[r.status]} /> },
        { label: d.admin.common.amount, cell: (r) => formatMoney(r.amount, r.currency, locale), align: "end", nowrap: true },
        { label: t.failure, cell: (r) => r.failure_reason ?? "—" },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
      {isAdmin && (
        <Panel title={t.webhooks} actions={<Link className="sl-btn sl-btn--outline sl-btn--sm" href="?errors=1">{t.onlyErrors}</Link>}>
          <Table rowKey={(e) => `${e.gateway}:${e.event_id}`} rows={events} empty={d.admin.common.empty} columns={[
            { label: t.received, cell: (e) => when(e.received_at, locale), nowrap: true },
            { label: d.admin.orders.gateway, cell: (e) => e.gateway },
            { label: t.event, cell: (e) => <Mono>{e.event_type}</Mono> },
            { label: t.processed, cell: (e) => when(e.processed_at, locale), nowrap: true },
            { label: t.error, cell: (e) => (e.processing_error ? <span style={{ color: "var(--cherry-600)" }}>{e.processing_error.slice(0, 200)}</span> : "—") },
          ]} />
        </Panel>
      )}
    </AdminPage>
  );
}

type Refunds = Awaited<ReturnType<typeof listRefunds>>;
export function RefundsAdminView({ d, locale, data, params, emails }: { d: Dictionary; locale: Locale; data: Refunds; params: Params; emails: Map<string, string> }) {
  const t = d.admin.refunds;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} search={false} filters={[{ name: "status", label: d.admin.common.status, options: Object.entries(t.status).map(([value, label]) => ({ value, label })) }]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: d.admin.common.date, cell: (r) => when(r.created_at, locale), nowrap: true },
        { label: d.admin.orders.number, cell: (r) => <Link href={`/admin/orders/${r.order_id}`}>#{num((r.orders as unknown as { order_number: number } | null)?.order_number ?? 0, locale)}</Link> },
        { label: d.admin.common.status, cell: (r) => <StatusBadge status={r.status} label={t.status[r.status]} /> },
        { label: d.admin.common.amount, cell: (r) => formatMoney(r.amount, r.currency, locale), align: "end", nowrap: true },
        { label: t.reason, cell: (r) => r.reason ?? "—" },
        { label: t.by, cell: (r) => <span dir="ltr">{r.requested_by ? emails.get(r.requested_by) ?? shortId(r.requested_by) : "—"}</span> },
        { label: t.gatewayId, cell: (r) => <Mono>{r.gateway_refund_id ?? "—"}</Mono> },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}
