import "server-only";
import { createClient } from "@/lib/supabase/server";

export const TICKET_CATEGORIES = ["general", "order", "book", "character", "account", "privacy", "bug"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export type TicketSummary = { id: string; number: number; subject: string; category: string; status: string; updatedAt: string; createdAt: string };
export type TicketMessage = { id: string; body: string; fromStaff: boolean; createdAt: string };
export type TicketDetail = TicketSummary & { bookId: string | null; bookTitle: string | null; orderNumber: number | null; messages: TicketMessage[] };

export async function listTickets(): Promise<TicketSummary[]> {
  const db = await createClient();
  const { data, error } = await db.from("support_tickets").select("id, ticket_number, subject, category, status, updated_at, created_at").order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({ id: t.id, number: t.ticket_number, subject: t.subject, category: t.category, status: t.status, updatedAt: t.updated_at, createdAt: t.created_at }));
}

/** One of the parent's own tickets with its conversation (RLS hides everyone else's). */
export async function getTicket(id: string, ownerId: string): Promise<TicketDetail | null> {
  const db = await createClient();
  const { data: t } = await db
    .from("support_tickets")
    .select("id, ticket_number, subject, category, status, updated_at, created_at, book_id, books(title), orders(order_number), support_messages(id, body, is_staff, created_at)")
    .eq("id", id)
    .eq("owner_id", ownerId) // staff use the admin inbox, not this page
    .maybeSingle();
  if (!t) return null;
  const messages = [...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    id: t.id, number: t.ticket_number, subject: t.subject, category: t.category, status: t.status, updatedAt: t.updated_at, createdAt: t.created_at,
    bookId: t.book_id, bookTitle: (t.books as unknown as { title: string | null } | null)?.title ?? null,
    orderNumber: (t.orders as unknown as { order_number: number } | null)?.order_number ?? null,
    messages: messages.map((m) => ({ id: m.id, body: m.body, fromStaff: m.is_staff, createdAt: m.created_at })),
  };
}

/** Books and orders a parent can attach to a new ticket. */
export async function getTicketContext(): Promise<{ books: Array<{ id: string; title: string | null }>; orders: Array<{ id: string; number: number }> }> {
  const db = await createClient();
  const [{ data: books }, { data: orders }] = await Promise.all([
    db.from("books").select("id, title").order("updated_at", { ascending: false }).limit(50),
    db.from("orders").select("id, order_number").neq("status", "cancelled").order("created_at", { ascending: false }).limit(50),
  ]);
  return { books: books ?? [], orders: (orders ?? []).map((o) => ({ id: o.id, number: o.order_number })) };
}
