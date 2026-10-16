import Link from "next/link";
import { Avatar, Badge, Card, Icon, Input } from "@/components/storyling";
import { ConfirmAction } from "@/components/dashboard/ui/ConfirmAction";
import type { getTicketForStaff, listAudit, listBooks, listJobs, listTickets } from "@/lib/admin/queries";
import { cancelJob, retryBookJobs, retryJob, staffReply, updateTicket } from "@/lib/admin/actions";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ActionButton, ActionForm } from "../forms";
import { AdminPage, KeyValues, Mono, Pager, Panel, StatusBadge, Table, Toolbar, shortId, usd, when } from "../ui";

type Params = Record<string, string | undefined>;
const BOOK_STATUSES = ["draft", "story_generating", "story_ready", "story_approved", "illustrating", "preview_ready", "producing", "completed", "failed"];
const JOB_TYPES = ["character_generate", "scene_test", "story_generate", "story_rewrite_page", "page_illustration", "cover_illustration", "book_production", "pdf_render", "purge_expired_photos", "send_email"];

type Books = Awaited<ReturnType<typeof listBooks>>;
export function BooksAdminView({ d, locale, data, params, emails }: { d: Dictionary; locale: Locale; data: Books; params: Params; emails: Map<string, string> }) {
  const t = d.admin.books;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} placeholder={`${t.bookTitle} / ID`} filters={[{ name: "status", label: t.generation, options: BOOK_STATUSES.map((s) => ({ value: s, label: d.dashboard.status[s] ?? s })) }]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: d.admin.common.id, cell: (r) => <Mono>{shortId(r.id)}</Mono>, nowrap: true },
        { label: t.bookTitle, cell: (r) => <b>{r.title ?? d.dashboard.untitled}</b>, minWidth: 180 },
        { label: d.admin.common.owner, cell: (r) => <Link href={`/admin/customers/${r.owner_id}`} dir="ltr">{emails.get(r.owner_id) ?? shortId(r.owner_id)}</Link> },
        { label: t.pages, cell: (r) => num(r.page_count, locale), align: "end" },
        { label: t.orientation, cell: (r) => (r.orientation === "portrait" ? t.portrait : t.landscape) },
        { label: t.generation, cell: (r) => <StatusBadge status={r.status} label={d.dashboard.status[r.status]} /> },
        { label: t.payment, cell: (r) => <StatusBadge status={r.payment === "unpaid" ? "draft" : r.payment} label={t[r.payment as "paid" | "unpaid" | "refunded"]} /> },
        { label: t.aiCost, cell: (r) => usd(r.ai_cost_usd, locale, 4), align: "end", nowrap: true },
        { label: d.admin.common.actions, cell: (r) => (r.failedJobs ? (
          <span style={{ display: "grid", gap: 4 }}>
            <Link href={`/admin/jobs?status=failed&q=${r.id}`} style={{ color: "var(--cherry-600)", fontWeight: 700 }}>{d.admin.overview.failedJobs}: {num(r.failedJobs, locale)}</Link>
            <ActionButton action={retryBookJobs.bind(null, r.id)} label={t.retry} errors={d.errors} />
          </span>
        ) : "—") },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}

type Jobs = Awaited<ReturnType<typeof listJobs>>;
export function JobsAdminView({ d, locale, data, params }: { d: Dictionary; locale: Locale; data: Jobs; params: Params }) {
  const t = d.admin.jobs;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} placeholder="Job / book / owner ID" filters={[
        { name: "status", label: d.admin.common.status, options: Object.entries(t.status).map(([value, label]) => ({ value, label })) },
        { name: "type", label: t.type, options: JOB_TYPES.map((v) => ({ value: v, label: d.dashboard.activityTypes[v] ?? v.replace(/_/g, " ") })) },
      ]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: d.admin.common.id, cell: (r) => <Mono>{shortId(r.id)}</Mono>, nowrap: true },
        { label: t.type, cell: (r) => <span style={{ fontWeight: 700 }}>{d.dashboard.activityTypes[r.type] ?? r.type.replace(/_/g, " ")}</span>, nowrap: true },
        { label: d.admin.common.status, cell: (r) => <StatusBadge status={r.status} label={t.status[r.status]} /> },
        { label: t.stage, cell: (r) => `${r.stage} · ${num(r.progress, locale)}%`, nowrap: true },
        { label: t.attempts, cell: (r) => `${num(r.attempts, locale)}/${num(r.max_attempts, locale)}`, align: "end" },
        { label: t.lastError, cell: (r) => (r.last_error ? <span style={{ color: "var(--cherry-600)", overflowWrap: "anywhere", display: "block", maxWidth: 360 }}>{r.last_error.slice(0, 240)}</span> : "—"), minWidth: 200 },
        { label: d.admin.common.created, cell: (r) => when(r.created_at, locale), nowrap: true },
        { label: d.admin.common.actions, cell: (r) => (
          r.status === "failed" || r.status === "cancelled" ? <ActionButton action={retryJob.bind(null, r.id)} label={t.retry} errors={d.errors} />
          : r.status === "queued" ? <ConfirmAction action={cancelJob.bind(null, r.id)} label={t.cancel} title={t.cancelTitle} body={t.cancelBody} confirmLabel={t.cancel} cancelLabel={d.admin.common.cancel} errors={d.errors} icon="x" variant="ghost" />
          : "—"
        ) },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}

type Tickets = Awaited<ReturnType<typeof listTickets>>;
export function SupportAdminView({ d, locale, data, params, emails, me }: { d: Dictionary; locale: Locale; data: Tickets; params: Params; emails: Map<string, string>; me: string }) {
  const t = d.admin.support;
  return (
    <AdminPage title={t.title} sub={t.sub} actions={<Link className="sl-btn sl-btn--outline sl-btn--sm" href={`?assignee=${me}`}><Icon name="user" />{t.mine}</Link>}>
      <Toolbar d={d} params={params} placeholder={`${t.subject} / #`} filters={[{ name: "status", label: d.admin.common.status, options: Object.entries(d.support.status).map(([value, label]) => ({ value, label })) }]} />
      <Table rowKey={(r) => r.id} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: "#", cell: (r) => num(r.ticket_number, locale), nowrap: true },
        { label: t.subject, cell: (r) => <Link href={`/admin/support/${r.id}`} style={{ fontWeight: 700 }}>{r.subject}</Link>, minWidth: 200 },
        { label: t.customer, cell: (r) => <span dir="ltr">{r.owner_id ? emails.get(r.owner_id) ?? shortId(r.owner_id) : "—"}</span> },
        { label: t.category, cell: (r) => d.support.categories[r.category] ?? r.category },
        { label: d.admin.common.status, cell: (r) => <StatusBadge status={r.status} label={d.support.status[r.status]} /> },
        { label: t.priority, cell: (r) => <StatusBadge status={r.priority} label={t.priorities[r.priority]} /> },
        { label: t.assignee, cell: (r) => (r.assigned_to ? (r.assigned_to === me ? t.mine : <span dir="ltr">{emails.get(r.assigned_to) ?? shortId(r.assigned_to)}</span>) : t.unassigned) },
        { label: d.admin.common.updated, cell: (r) => when(r.updated_at, locale), nowrap: true },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}

type Ticket = NonNullable<Awaited<ReturnType<typeof getTicketForStaff>>>;
export function TicketAdminView({ d, locale, ticket, emails, me }: { d: Dictionary; locale: Locale; ticket: Ticket; emails: Map<string, string>; me: string }) {
  const t = d.admin.support;
  const closed = ticket.status === "closed";
  const book = ticket.books as unknown as { id: string; title: string | null } | null;
  const order = ticket.orders as unknown as { id: string; order_number: number } | null;
  return (
    <AdminPage back={{ href: "/admin/support", label: t.title }} title={ticket.subject} sub={d.support.ticket(num(ticket.ticket_number, locale))}>
      <div className="grid wide:grid-cols-[1fr_320px] gap-5 items-start">
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          {ticket.support_messages.map((m) => (
            <Card key={m.id} tone={m.is_staff ? "sky" : "white"} variant="flat" padding={16} style={{ display: "grid", gap: 6, boxShadow: "inset 0 0 0 2px var(--ink-100)" }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", font: "var(--type-caption)", color: "var(--ink-500)" }}>
                <Avatar name={m.is_staff ? "S" : emails.get(ticket.owner_id ?? "") ?? "P"} size={28} tone={m.is_staff ? "sun" : "bubble"} />
                <b style={{ color: "var(--ink-900)" }} dir="ltr">{m.is_staff ? (m.author_id === me ? d.support.you : emails.get(m.author_id ?? "") ?? d.support.team) : emails.get(ticket.owner_id ?? "") ?? d.support.you}</b>
                · {when(m.created_at, locale)}
              </span>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body}</p>
            </Card>
          ))}
          {!closed && (
            <Panel title={t.reply}>
              <ActionForm action={staffReply.bind(null, ticket.id)} submit={t.send} saved={d.admin.common.saved} errors={d.errors} icon="paper-plane-tilt" resetOnSuccess>
                <Input name="body" multiline required maxLength={5000} hint={t.replyHint} aria-label={t.reply} />
              </ActionForm>
            </Panel>
          )}
        </div>
        <Panel title={d.admin.common.details}>
          <KeyValues items={[
            [d.admin.common.status, <StatusBadge key="s" status={ticket.status} label={d.support.status[ticket.status]} />],
            [t.priority, <StatusBadge key="p" status={ticket.priority} label={t.priorities[ticket.priority]} />],
            [t.category, d.support.categories[ticket.category] ?? ticket.category],
            [t.customer, ticket.owner_id ? <Link key="c" href={`/admin/customers/${ticket.owner_id}`} dir="ltr">{emails.get(ticket.owner_id) ?? shortId(ticket.owner_id)}</Link> : "—"],
            [t.assignee, ticket.assigned_to ? (ticket.assigned_to === me ? t.mine : emails.get(ticket.assigned_to) ?? shortId(ticket.assigned_to)) : t.unassigned],
            ...(book ? [[d.admin.orders.book, <Link key="b" href={`/admin/books?q=${book.id}`}>{book.title ?? d.dashboard.untitled}</Link>] as [string, React.ReactNode]] : []),
            ...(order ? [[d.admin.orders.number, <Link key="o" href={`/admin/orders/${order.id}`}>#{num(order.order_number, locale)}</Link>] as [string, React.ReactNode]] : []),
          ]} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ticket.assigned_to !== me
              ? <ActionButton action={updateTicket.bind(null, ticket.id, { assign: "me" })} label={t.assignMe} errors={d.errors} icon="user-plus" />
              : <ActionButton action={updateTicket.bind(null, ticket.id, { assign: "none" })} label={t.unassign} errors={d.errors} icon="user-minus" />}
            {(["low", "normal", "high", "urgent"] as const).filter((p) => p !== ticket.priority).map((p) => (
              <ActionButton key={p} action={updateTicket.bind(null, ticket.id, { priority: p })} label={t.priorities[p]} errors={d.errors} icon="flag" variant="ghost" />
            ))}
          </div>
          {!closed && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ticket.status !== "resolved" && <ActionButton action={updateTicket.bind(null, ticket.id, { status: "resolved" })} label={t.resolve} errors={d.errors} icon="check-circle" variant="secondary" />}
              <ActionButton action={updateTicket.bind(null, ticket.id, { status: "closed" })} label={t.close} errors={d.errors} icon="archive" />
            </div>
          )}
          <p style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>{t.internalNote}</p>
        </Panel>
      </div>
    </AdminPage>
  );
}

type Audit = Awaited<ReturnType<typeof listAudit>>;
export function AuditAdminView({ d, locale, data, params, emails }: { d: Dictionary; locale: Locale; data: Audit; params: Params; emails: Map<string, string> }) {
  const t = d.admin.audit;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Toolbar d={d} params={params} placeholder={t.action} />
      <Table rowKey={(r) => String(r.id)} rows={data.rows} empty={d.admin.common.empty} columns={[
        { label: d.admin.common.date, cell: (r) => when(r.created_at, locale), nowrap: true },
        { label: t.actor, cell: (r) => <span dir="ltr">{r.actor_id ? emails.get(r.actor_id) ?? shortId(r.actor_id) : "system"}</span> },
        { label: t.action, cell: (r) => <Badge size="sm" tone="ink" variant="soft">{r.action}</Badge> },
        { label: t.target, cell: (r) => (r.target_table ? <Mono>{r.target_table}:{shortId(r.target_id)}</Mono> : "—") },
        { label: d.admin.common.details, cell: (r) => <Mono>{JSON.stringify(r.details).slice(0, 200)}</Mono> },
        { label: t.ip, cell: (r) => <Mono>{String(r.ip_address ?? "—")}</Mono> },
      ]} />
      <Pager d={d} page={data.page} pages={data.pages} total={data.total} params={params} />
    </AdminPage>
  );
}
