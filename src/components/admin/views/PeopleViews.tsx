import Link from "next/link";
import { Badge, Input } from "@/components/storyling";
import { ConfirmAction } from "@/components/dashboard/ui/ConfirmAction";
import type { CustomerRow, Page, listCharacters, listChildren, getCustomer } from "@/lib/admin/queries";
import { processDeletion, rejectDeletion, restoreCustomer, suspendCustomer } from "@/lib/admin/actions";
import { formatMoney } from "@/lib/payments/pricing";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ActionForm } from "../forms";
import { AdminPage, KeyValues, Mono, Pager, Panel, StatusBadge, Table, Toolbar, shortId, when } from "../ui";

type Params = Record<string, string | undefined>;

export function CustomersView({ d, locale, data, params }: { d: Dictionary; locale: Locale; data: Page<CustomerRow>; params: Params }) {
  const t = d.admin.customers;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} placeholder={`${t.email} / ${t.name} / ID`} filters={[{ name: "status", label: d.admin.common.status, options: [
        ...Object.entries(t.status).map(([value, label]) => ({ value, label })), { value: "deletion_pending", label: t.deletionRequests },
      ] }]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: t.email, cell: (r) => <Link href={`/admin/customers/${r.id}`} dir="ltr" style={{ fontWeight: 700 }}>{r.email}</Link> },
        { label: t.name, cell: (r) => r.display_name ?? "—" },
        { label: d.admin.common.status, cell: (r) => <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}><StatusBadge status={r.status} label={t.status[r.status]} />{r.deletion_status && ["pending", "processing"].includes(r.deletion_status) && <StatusBadge status="deletion_requested" label={t.deletionRequests} />}</span> },
        { label: t.roles, cell: (r) => r.roles.filter((x) => x !== "parent").map((x) => <Badge key={x} size="sm" tone="ink">{x}</Badge>) },
        { label: t.children, cell: (r) => num(r.children, locale), align: "end" },
        { label: t.books, cell: (r) => num(r.books, locale), align: "end" },
        { label: t.paidOrders, cell: (r) => num(r.paid_orders, locale), align: "end" },
        { label: t.joined, cell: (r) => when(r.created_at, locale), nowrap: true },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}

type Customer = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

export function CustomerDetailView({ d, locale, c, isAdmin, now }: { d: Dictionary; locale: Locale; c: Customer; isAdmin: boolean; now: number }) {
  const t = d.admin.customers;
  const common = d.admin.common;
  return (
    <AdminPage back={{ href: "/admin/customers", label: t.title }} title={<span dir="ltr">{c.email}</span>} sub={c.display_name ?? undefined}>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(380px,100%),1fr))", alignItems: "start" }}>
        <Panel title={common.details}>
          <KeyValues items={[
            [common.id, <Mono key="id">{c.id}</Mono>], [common.status, <StatusBadge key="s" status={c.status} label={t.status[c.status]} />],
            [t.roles, c.roles.join(", ")], [t.language, c.locale], [t.joined, when(c.created_at, locale)],
            ...(c.suspendedReason ? [[t.reason, c.suspendedReason] as [string, string]] : []),
          ]} />
          <p style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>{t.noPhotos}</p>
          {isAdmin && c.status === "active" && (
            <ActionForm action={suspendCustomer.bind(null, c.id)} submit={t.suspend} saved={common.saved} errors={d.errors} variant="cherry" icon="prohibit">
              <Input name="reason" label={t.reason} required maxLength={500} />
            </ActionForm>
          )}
          {isAdmin && c.status === "suspended" && (
            <ConfirmAction action={restoreCustomer.bind(null, c.id)} label={t.restore} title={t.restoreTitle} body={t.restoreBody} confirmLabel={t.restore} cancelLabel={common.cancel} errors={d.errors} icon="arrow-counter-clockwise" variant="secondary" />
          )}
        </Panel>

        <Panel title={t.deletionRequests}>
          <Table rowKey={(r) => r.id} rows={c.deletions} empty={common.empty} columns={[
            { label: common.status, cell: (r) => <StatusBadge status={r.status} label={t.deletionStatus[r.status]} /> },
            { label: t.requested, cell: (r) => when(r.requested_at, locale), nowrap: true },
            { label: t.scheduled, cell: (r) => when(r.scheduled_for, locale), nowrap: true },
          ]} />
          {c.deletions.find((r) => r.reason) && <p style={{ font: "var(--type-small)", color: "var(--ink-700)" }}>“{c.deletions.find((r) => r.reason)!.reason}”</p>}
          {isAdmin && c.deletions.filter((r) => r.status === "pending").map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {new Date(r.scheduled_for).getTime() <= now
                ? <ConfirmAction action={processDeletion.bind(null, r.id)} label={t.processDeletion} title={t.processTitle} body={t.processBody} confirmLabel={t.processDeletion} cancelLabel={common.cancel} errors={d.errors} redirectTo="/admin/customers" />
                : <span style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>{t.graceNotOver}</span>}
              <ConfirmAction action={rejectDeletion.bind(null, r.id)} label={t.rejectDeletion} title={t.rejectTitle} body={t.rejectBody} confirmLabel={t.rejectDeletion} cancelLabel={common.cancel} errors={d.errors} icon="x" variant="ghost" />
            </div>
          ))}
        </Panel>

        <Panel title={t.orders}>
          <Table rowKey={(o) => o.id} rows={c.orders} empty={common.empty} columns={[
            { label: d.admin.orders.number, cell: (o) => <Link href={`/admin/orders/${o.id}`}>#{num(o.order_number, locale)}</Link> },
            { label: common.status, cell: (o) => <StatusBadge status={o.status} label={d.orders.status[o.status]} /> },
            { label: d.admin.orders.total, cell: (o) => formatMoney(o.total_amount, o.currency, locale), align: "end", nowrap: true },
            { label: common.created, cell: (o) => when(o.created_at, locale), nowrap: true },
          ]} />
        </Panel>

        <Panel title={t.books}>
          <Table rowKey={(b) => b.id} rows={c.books} empty={common.empty} columns={[
            { label: d.admin.books.bookTitle, cell: (b) => <Link href={`/admin/books?q=${b.id}`}>{b.title ?? d.dashboard.untitled}</Link> },
            { label: common.status, cell: (b) => <StatusBadge status={b.status} label={d.dashboard.status[b.status]} /> },
            { label: d.admin.books.pages, cell: (b) => num(b.page_count, locale), align: "end" },
          ]} />
        </Panel>

        <Panel title={t.children}>
          <Table rowKey={(k) => k.id} rows={c.children} empty={common.empty} columns={[
            { label: d.admin.children.name, cell: (k) => k.display_name },
            { label: d.admin.children.age, cell: (k) => (k.age_years === null ? "—" : num(k.age_years, locale)), align: "end" },
            { label: d.admin.children.language, cell: (k) => k.preferred_language },
          ]} />
        </Panel>
      </div>
    </AdminPage>
  );
}

type Children = Awaited<ReturnType<typeof listChildren>>;
export function ChildrenAdminView({ d, locale, data, params, emails }: { d: Dictionary; locale: Locale; data: Children; params: Params; emails: Map<string, string> }) {
  const t = d.admin.children;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} placeholder={`${t.name} / ${d.admin.common.owner} ID`} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: t.name, cell: (r) => <b>{r.display_name}</b> },
        { label: t.age, cell: (r) => (r.age_years === null ? "—" : num(r.age_years, locale)), align: "end" },
        { label: t.language, cell: (r) => r.preferred_language },
        { label: t.characters, cell: (r) => num(r.characters, locale), align: "end" },
        { label: t.books, cell: (r) => num(r.books, locale), align: "end" },
        { label: d.admin.common.owner, cell: (r) => <Link href={`/admin/customers/${r.owner_id}`} dir="ltr">{emails.get(r.owner_id) ?? shortId(r.owner_id)}</Link> },
        { label: d.admin.common.created, cell: (r) => when(r.created_at, locale), nowrap: true },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}

type Characters = Awaited<ReturnType<typeof listCharacters>>;
export function CharactersAdminView({ d, locale, data, params, emails }: { d: Dictionary; locale: Locale; data: Characters; params: Params; emails: Map<string, string> }) {
  const t = d.admin.characters;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} filters={[{ name: "status", label: d.admin.common.status, options: Object.entries(t.status).map(([value, label]) => ({ value, label })) }]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: t.name, cell: (r) => <b>{r.name}</b> },
        { label: t.child, cell: (r) => (r.child_profiles as unknown as { display_name: string } | null)?.display_name ?? "—" },
        { label: t.style, cell: (r) => { const s = r.illustration_styles as unknown as { name_en: string; name_ar: string } | null; return s ? (locale === "ar" ? s.name_ar : s.name_en) : "—"; } },
        { label: d.admin.common.status, cell: (r) => <StatusBadge status={r.status} label={t.status[r.status]} /> },
        { label: t.attempts, cell: (r) => num(r.generation_count, locale), align: "end" },
        { label: d.admin.common.owner, cell: (r) => <Link href={`/admin/customers/${r.owner_id}`} dir="ltr">{emails.get(r.owner_id) ?? shortId(r.owner_id)}</Link> },
        { label: d.admin.common.created, cell: (r) => when(r.created_at, locale), nowrap: true },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}
