import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OrderRow = {
  id: string; orderNumber: number; status: string; createdAt: string; paidAt: string | null; currency: string;
  subtotal: number; discount: number; total: number; refunded: number; gateway: string | null;
  bookId: string | null; bookTitle: string | null;
  items: Array<{ description: string; pageCount: number; unitAmount: number; quantity: number }>;
  refunds: Array<{ amount: number; status: string; createdAt: string }>;
};

/** The parent's orders, newest first (RLS: own orders only). Abandoned checkouts are hidden. */
export async function listOrders(): Promise<OrderRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("orders")
    .select("id, order_number, status, created_at, paid_at, currency, subtotal_amount, discount_amount, total_amount, refunded_amount, gateway, book_id, books(title), order_items(description, page_count, unit_amount, quantity), refunds(amount, status, created_at)")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => ({
    id: o.id, orderNumber: o.order_number, status: o.status, createdAt: o.created_at, paidAt: o.paid_at, currency: o.currency,
    subtotal: o.subtotal_amount, discount: o.discount_amount, total: o.total_amount, refunded: o.refunded_amount, gateway: o.gateway,
    bookId: o.book_id, bookTitle: (o.books as unknown as { title: string | null } | null)?.title ?? null,
    items: (o.order_items ?? []).map((i) => ({ description: i.description, pageCount: i.page_count, unitAmount: i.unit_amount, quantity: i.quantity })),
    refunds: (o.refunds ?? []).map((r) => ({ amount: r.amount, status: r.status, createdAt: r.created_at })),
  }));
}

export type AccountSettings = {
  email: string | null; displayName: string | null; locale: "en" | "ar"; marketingOptIn: boolean; usesPassword: boolean;
  deletion: { id: string; status: string; requestedAt: string; scheduledFor: string } | null;
};

export async function getAccountSettings(userId: string): Promise<AccountSettings> {
  const db = await createClient();
  const [{ data: claims }, { data: profile, error }, { data: deletion }] = await Promise.all([
    db.auth.getClaims(),
    db.from("profiles").select("display_name, locale, marketing_opt_in").eq("id", userId).single(),
    db.from("account_deletion_requests").select("id, status, requested_at, scheduled_for").eq("user_id", userId).in("status", ["pending", "processing"]).maybeSingle(),
  ]);
  if (error || !profile) throw new Error(error?.message ?? "profile missing");
  const c = claims?.claims as { email?: string; app_metadata?: { provider?: string; providers?: string[] } } | undefined;
  const providers = c?.app_metadata?.providers ?? (c?.app_metadata?.provider ? [c.app_metadata.provider] : ["email"]);
  return {
    email: c?.email ?? null, displayName: profile.display_name, locale: profile.locale, marketingOptIn: profile.marketing_opt_in,
    usesPassword: providers.includes("email"),
    deletion: deletion ? { id: deletion.id, status: deletion.status, requestedAt: deletion.requested_at, scheduledFor: deletion.scheduled_for } : null,
  };
}
