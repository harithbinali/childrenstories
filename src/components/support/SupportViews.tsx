import Link from "next/link";
import { Avatar, Badge, Button, Card, Icon, type BadgeTone } from "@/components/storyling";
import { ConfirmAction } from "@/components/dashboard/ui/ConfirmAction";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import { closeTicket } from "@/lib/support/actions";
import { TICKET_CATEGORIES, type TicketDetail, type TicketSummary } from "@/lib/support/queries";
import { formatDate, num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { NewTicketForm } from "./SupportForms";

const STATUS_TONE: Record<string, BadgeTone> = { open: "sky", awaiting_staff: "sky", awaiting_customer: "sun", resolved: "mint", closed: "ink" };

export function SupportListView({ d, locale, tickets }: { d: Dictionary; locale: Locale; tickets: TicketSummary[] }) {
  const t = d.support;
  return (
    <PageBody>
      <PageHeader title={t.title} sub={t.sub} actions={<Button iconStart="plus" href="/dashboard/support/new">{t.newTicket}</Button>} />
      {tickets.length === 0 ? (
        <Card tone="paper" variant="flat" padding={28}><p>{t.empty}</p></Card>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
          {tickets.map((k) => (
            <li key={k.id}>
              <Card href={`/dashboard/support/${k.id}`} interactive padding={20} style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0, flex: "1 1 260px" }}>
                  <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: "var(--tint-sky)", display: "grid", placeItems: "center", flex: "none" }}>
                    <Icon name="chat-circle-dots" weight="duotone" size={24} color="var(--ink-900)" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ font: "var(--type-h4)", color: "var(--ink-900)", display: "block", overflowWrap: "anywhere" }}>{k.subject}</b>
                    <span style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>
                      {t.ticket(num(k.number, locale))} · {t.categories[k.category] ?? k.category} · {t.updated(formatDate(k.updatedAt, locale))}
                    </span>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[k.status] ?? "ink"} variant="soft">{t.status[k.status] ?? k.status}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  );
}

export function NewTicketView({ d, locale, books, orders, initial }: {
  d: Dictionary; locale: Locale; books: Array<{ id: string; title: string | null }>; orders: Array<{ id: string; number: number }>;
  initial: { category?: string; bookId?: string; orderId?: string };
}) {
  const t = d.support;
  return (
    <PageBody>
      <PageHeader back={{ href: "/dashboard/support", label: t.back }} title={t.newTitle} />
      <Card padding="clamp(22px,3vw,32px)" style={{ maxWidth: 760 }}>
        <NewTicketForm errors={d.errors} initial={initial}
          labels={{ subject: t.subject, subjectPlaceholder: t.subjectPlaceholder, category: t.category, book: t.book, order: t.order, none: t.none,
            message: t.message, messagePlaceholder: t.messagePlaceholder, messageHint: t.messageHint, send: t.send, sending: t.sending }}
          categories={TICKET_CATEGORIES.map((c) => ({ value: c, label: t.categories[c] }))}
          books={books.map((b) => ({ value: b.id, label: b.title ?? d.dashboard.untitled }))}
          orders={orders.map((o) => ({ value: o.id, label: d.orders.order(num(o.number, locale)) }))} />
      </Card>
    </PageBody>
  );
}

export function TicketView({ d, locale, ticket, userName, replyForm }: { d: Dictionary; locale: Locale; ticket: TicketDetail; userName: string; replyForm: React.ReactNode }) {
  const t = d.support;
  const closed = ticket.status === "closed";
  return (
    <PageBody>
      <PageHeader back={{ href: "/dashboard/support", label: t.back }} eyebrow={t.ticket(num(ticket.number, locale))}
        title={<span style={{ overflowWrap: "anywhere" }}>{ticket.subject}</span>}
        actions={!closed ? <ConfirmAction action={closeTicket.bind(null, ticket.id)} label={t.close} title={t.closeTitle} body={t.closeBody}
          confirmLabel={t.close} cancelLabel={t.cancel} errors={d.errors} icon="check-circle" /> : undefined} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Badge tone={STATUS_TONE[ticket.status] ?? "ink"} variant="soft">{t.status[ticket.status] ?? ticket.status}</Badge>
        <Badge tone="ink" variant="soft" icon="tag">{t.categories[ticket.category] ?? ticket.category}</Badge>
        {ticket.bookId && (
          <Link href={`/dashboard/books/${ticket.bookId}`} style={{ display: "inline-flex", gap: 6, alignItems: "center", font: "700 14px var(--font-body)" }}>
            <Icon name="book-open" />{ticket.bookTitle ?? d.dashboard.untitled}
          </Link>
        )}
        {ticket.orderNumber !== null && <span style={{ font: "700 14px var(--font-body)", display: "inline-flex", gap: 6, alignItems: "center" }}><Icon name="receipt" />{d.orders.order(num(ticket.orderNumber, locale))}</span>}
      </div>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16, maxWidth: 820 }}>
        {ticket.messages.map((m) => (
          <li key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: m.fromStaff ? "row" : "row-reverse" }}>
            {m.fromStaff
              ? <span aria-hidden style={{ width: 44, height: 44, borderRadius: 999, background: "var(--sun-400)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="star" color="var(--ink-900)" /></span>
              : <Avatar name={userName} tone="bubble" size={44} />}
            <Card tone={m.fromStaff ? "sky" : "white"} padding={18} style={{ display: "grid", gap: 8, maxWidth: "min(620px, 100%)", minWidth: 0 }}>
              <span style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}><b style={{ color: "var(--ink-900)" }}>{m.fromStaff ? t.team : t.you}</b> · {formatDate(m.createdAt, locale, true)}</span>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body}</p>
            </Card>
          </li>
        ))}
      </ol>

      <Card padding="clamp(20px,3vw,28px)" style={{ maxWidth: 820 }}>
        {closed ? <p style={{ color: "var(--ink-700)" }}>{t.closedNote}</p> : replyForm}
      </Card>
    </PageBody>
  );
}
