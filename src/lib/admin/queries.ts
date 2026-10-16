import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin reads run as the signed-in staff member, so row-level security still
 * applies (staff can read operational data but never child photos). Writes go
 * through ./actions.ts.
 */
export const PAGE_SIZE = 25;
export type Page<T> = { rows: T[]; total: number; page: number; pages: number };
export type ListParams = { q?: string; status?: string; type?: string; page?: number };

const range = (page = 1) => [(Math.max(1, page) - 1) * PAGE_SIZE, Math.max(1, page) * PAGE_SIZE - 1] as const;
const pageOf = <T>(rows: T[] | null, count: number | null, page = 1): Page<T> => ({ rows: rows ?? [], total: count ?? 0, page: Math.max(1, page), pages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)) });
const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
/** Escapes a user search term for PostgREST ilike filters. */
const like = (q: string) => `%${q.replace(/[%_\\,()]/g, (c) => `\\${c}`)}%`;

export type Overview = {
  parents: number; children: number; characters: number; books: number; paid_books: number; revenue: Record<string, number>; refunds: Record<string, number>;
  ai_cost_usd: number; ai_unpriced_calls: number; ai_cost_24h_usd: number; pending_jobs: number; failed_jobs: number; failed_jobs_24h: number; open_tickets: number; pending_deletions: number;
};
export async function getOverview(): Promise<Overview> {
  const { data, error } = await (await createClient()).rpc("admin_overview");
  if (error) throw new Error(error.message);
  return data as Overview;
}

export type Report = {
  from: string;
  days: Array<{ day: string; sales: number; revenue_usd: number; refunds_usd: number; ai_cost_usd: number; new_customers: number }>;
  themes: Array<{ slug: string; name_en: string; name_ar: string; books: number; paid: number }>;
  payments: Array<{ gateway: string; status: string; count: number; amount: number; currency: string }>;
  checkouts: { started: number; paid: number; failed: number };
};
export async function getReport(days: number): Promise<Report> {
  const { data, error } = await (await createClient()).rpc("admin_report", { p_days: days });
  if (error) throw new Error(error.message);
  return data as Report;
}

export type CustomerRow = { id: string; email: string; display_name: string | null; status: string; locale: string; created_at: string; roles: string[]; children: number; books: number; paid_orders: number; deletion_status: string | null };
export async function listCustomers(p: ListParams): Promise<Page<CustomerRow>> {
  const [from] = range(p.page);
  const { data, error } = await (await createClient()).rpc("admin_customers", { p_query: p.q ?? null, p_status: p.status ?? null, p_limit: PAGE_SIZE, p_offset: from });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<CustomerRow & { total: number }>;
  return pageOf(rows, rows[0]?.total ?? 0, p.page);
}

export async function getCustomer(id: string) {
  if (!isUuid(id)) return null;
  const db = await createClient();
  const { data: rows } = await db.rpc("admin_customers", { p_query: id, p_limit: 1 });
  const c = (rows as CustomerRow[] | null)?.[0];
  if (!c) return null;
  const [children, books, orders, deletions, profile] = await Promise.all([
    db.from("child_profiles").select("id, display_name, age_years, preferred_language, created_at").eq("owner_id", id).order("created_at"),
    db.from("books").select("id, title, status, page_count, created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("orders").select("id, order_number, status, total_amount, refunded_amount, currency, created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("account_deletion_requests").select("id, status, reason, requested_at, scheduled_for, processed_at").eq("user_id", id).order("requested_at", { ascending: false }),
    db.from("profiles").select("suspended_reason").eq("id", id).single(),
  ]);
  return { ...c, suspendedReason: profile.data?.suspended_reason ?? null, children: children.data ?? [], books: books.data ?? [], orders: orders.data ?? [], deletions: deletions.data ?? [] };
}

export async function listChildren(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("child_profiles").select("id, owner_id, display_name, age_years, preferred_language, created_at, characters(count), books(count)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.q) q = isUuid(p.q) ? q.eq("owner_id", p.q) : q.ilike("display_name", like(p.q));
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf((data ?? []).map((c) => ({ ...c, characters: (c.characters as unknown as Array<{ count: number }>)[0]?.count ?? 0, books: (c.books as unknown as Array<{ count: number }>)[0]?.count ?? 0 })), count, p.page);
}

export async function listCharacters(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("characters").select("id, owner_id, name, status, generation_count, approved_at, created_at, child_profiles(display_name), illustration_styles(name_en, name_ar)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  if (p.q) q = isUuid(p.q) ? q.eq("owner_id", p.q) : q.ilike("name", like(p.q));
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

export async function listBooks(p: ListParams) {
  const db = await createClient();
  const [from, to] = range(p.page);
  let q = db.from("books").select("id, owner_id, title, page_count, orientation, status, ai_cost_usd, created_at, book_entitlements(revoked_at)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  if (p.q) q = isUuid(p.q) ? q.or(`id.eq.${p.q},owner_id.eq.${p.q}`) : q.ilike("title", like(p.q));
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((b) => b.id);
  const { data: failed } = ids.length ? await db.from("generation_jobs").select("book_id").in("book_id", ids).eq("status", "failed") : { data: [] };
  const failedCount = new Map<string, number>();
  for (const j of failed ?? []) failedCount.set(j.book_id!, (failedCount.get(j.book_id!) ?? 0) + 1);
  return pageOf((data ?? []).map((b) => {
    const e = b.book_entitlements as unknown as { revoked_at: string | null } | { revoked_at: string | null }[] | null;
    const ent = Array.isArray(e) ? e[0] : e;
    return { ...b, payment: ent ? (ent.revoked_at ? "refunded" : "paid") : "unpaid", failedJobs: failedCount.get(b.id) ?? 0 };
  }), count, p.page);
}

export async function listJobs(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("generation_jobs").select("id, type, status, stage, progress, attempts, max_attempts, last_error, run_after, created_at, updated_at, book_id, owner_id", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  if (p.type) q = q.eq("type", p.type);
  if (p.q && isUuid(p.q)) q = q.or(`id.eq.${p.q},book_id.eq.${p.q},owner_id.eq.${p.q}`);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

export async function listOrders(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("orders").select("id, order_number, owner_id, customer_email, status, total_amount, refunded_amount, currency, gateway, paid_at, created_at, books(title)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  if (p.q) q = /^\d+$/.test(p.q) ? q.eq("order_number", Number(p.q)) : isUuid(p.q) ? q.or(`id.eq.${p.q},owner_id.eq.${p.q},book_id.eq.${p.q}`) : q.ilike("customer_email", like(p.q));
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

export type OrderDetail = {
  id: string; order_number: number; owner_id: string | null; customer_email: string | null; status: string; currency: string; subtotal_amount: number; discount_amount: number;
  total_amount: number; refunded_amount: number; gateway: string | null; gateway_checkout_id: string | null; paid_at: string | null; created_at: string;
  books: { id: string; title: string | null } | null;
  order_items: Array<{ description: string; page_count: number; unit_amount: number; quantity: number; currency: string }>;
  payments: Array<{ id: string; gateway: string; gateway_payment_id: string; status: string; amount: number; currency: string; failure_reason: string | null; created_at: string }>;
  refunds: Array<{ id: string; amount: number; currency: string; status: string; reason: string | null; gateway_refund_id: string | null; created_at: string }>;
};

export async function getOrder(id: string): Promise<OrderDetail | null> {
  if (!isUuid(id)) return null;
  const { data } = await (await createClient()).from("orders")
    .select("id, order_number, owner_id, customer_email, status, currency, subtotal_amount, discount_amount, total_amount, refunded_amount, gateway, gateway_checkout_id, paid_at, created_at, books(id, title), order_items(description, page_count, unit_amount, quantity, currency), payments(id, gateway, gateway_payment_id, status, amount, currency, failure_reason, created_at), refunds(id, amount, currency, status, reason, gateway_refund_id, created_at)")
    .eq("id", id).maybeSingle();
  return (data as unknown as OrderDetail) ?? null;
}

export async function listPayments(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("payments").select("id, order_id, gateway, gateway_payment_id, status, amount, currency, failure_reason, created_at, orders(order_number)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  if (p.type) q = q.eq("gateway", p.type);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

/** Webhook events — admin only under RLS (staff get an empty list). */
export async function listWebhookEvents(onlyErrors: boolean) {
  let q = (await createClient()).from("payment_webhook_events").select("gateway, event_id, event_type, received_at, processed_at, processing_error").order("received_at", { ascending: false }).limit(50);
  if (onlyErrors) q = q.not("processing_error", "is", null);
  const { data } = await q;
  return data ?? [];
}

export async function listRefunds(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("refunds").select("id, order_id, amount, currency, status, reason, gateway_refund_id, requested_by, created_at, orders(order_number, gateway)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

export type ProductRow = { id: string; sku: string; name_en: string; name_ar: string; page_count: number; price_amount: number; currency: string; is_active: boolean; free_preview_pages: number; included_regenerations: number; sort_order: number };
export type DiscountRow = { id: string; code: string; percent_off: number | null; amount_off: number | null; currency: string | null; max_redemptions: number | null; redeemed_count: number; starts_at: string | null; expires_at: string | null; is_active: boolean; created_at: string };
export type ThemeRow = { id: string; slug: string; name_en: string; name_ar: string; description_en: string; description_ar: string; prompt_guidance: string; is_custom: boolean; is_featured: boolean; is_active: boolean; sort_order: number };
export type StyleRow = { id: string; slug: string; name_en: string; name_ar: string; description_en: string; description_ar: string; prompt_template: string; is_active: boolean; sort_order: number };

export async function getProductsAndDiscounts(): Promise<{ products: ProductRow[]; discounts: DiscountRow[] }> {
  const db = await createClient();
  const [products, discounts] = await Promise.all([
    db.from("book_products").select("id, sku, name_en, name_ar, page_count, price_amount, currency, is_active, free_preview_pages, included_regenerations, sort_order").order("sort_order"),
    db.from("discount_codes").select("id, code, percent_off, amount_off, currency, max_redemptions, redeemed_count, starts_at, expires_at, is_active, created_at").order("created_at", { ascending: false }),
  ]);
  return { products: (products.data ?? []) as ProductRow[], discounts: (discounts.data ?? []) as DiscountRow[] };
}

export async function getThemes(): Promise<ThemeRow[]> {
  const { data } = await (await createClient()).from("story_themes").select("id, slug, name_en, name_ar, description_en, description_ar, prompt_guidance, is_custom, is_featured, is_active, sort_order").order("sort_order");
  return (data ?? []) as ThemeRow[];
}
export async function getStyles(): Promise<StyleRow[]> {
  const { data } = await (await createClient()).from("illustration_styles").select("id, slug, name_en, name_ar, description_en, description_ar, prompt_template, is_active, sort_order").order("sort_order");
  return (data ?? []) as StyleRow[];
}

export type AiSettingRow = { purpose: string; model: string; params: Record<string, unknown>; timeout_ms: number; max_retries: number; pricing: Record<string, unknown>; updated_at: string };
export async function getAiSettings(): Promise<AiSettingRow[]> {
  const { data } = await (await createClient()).from("ai_model_settings").select("purpose, model, params, timeout_ms, max_retries, pricing, updated_at").order("purpose");
  return (data ?? []) as AiSettingRow[];
}

/** Platform settings are staff-readable under RLS. */
export async function getPlatformSettings(keys: string[]): Promise<Record<string, unknown>> {
  const { data } = await (await createClient()).from("platform_settings").select("key, value").in("key", keys);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

export type GatewayRow = { gateway: "stripe" | "paypal"; is_enabled: boolean; is_default: boolean; mode: string; supported_currencies: string[]; updated_at: string };
export async function getGateways(): Promise<GatewayRow[]> {
  const { data } = await (await createClient()).from("payment_gateway_configs").select("gateway, is_enabled, is_default, mode, supported_currencies, updated_at").order("gateway");
  return (data ?? []) as GatewayRow[];
}

export type ContentRow = { key: string; locale: "en" | "ar"; content: unknown; is_published: boolean; updated_at: string };
export async function getMarketingContentRows(): Promise<ContentRow[]> {
  const { data } = await (await createClient()).from("marketing_content").select("key, locale, content, is_published, updated_at");
  return (data ?? []) as ContentRow[];
}

export async function listTickets(p: ListParams & { assignee?: string }) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("support_tickets").select("id, ticket_number, owner_id, subject, category, status, priority, assigned_to, updated_at, created_at", { count: "exact" }).order("updated_at", { ascending: false }).range(from, to);
  if (p.status) q = q.eq("status", p.status);
  if (p.assignee) q = q.eq("assigned_to", p.assignee);
  if (p.q) q = /^\d+$/.test(p.q) ? q.eq("ticket_number", Number(p.q)) : q.ilike("subject", like(p.q));
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

export type StaffTicket = {
  id: string; ticket_number: number; owner_id: string | null; subject: string; category: string; status: string; priority: string; assigned_to: string | null;
  books: { id: string; title: string | null } | null; orders: { id: string; order_number: number } | null;
  support_messages: Array<{ id: string; body: string; is_staff: boolean; author_id: string | null; created_at: string }>;
};

export async function getTicketForStaff(id: string): Promise<StaffTicket | null> {
  if (!isUuid(id)) return null;
  const { data } = await (await createClient()).from("support_tickets")
    .select("id, ticket_number, owner_id, subject, category, status, priority, assigned_to, books(id, title), orders(id, order_number), support_messages(id, body, is_staff, author_id, created_at)")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  const t = data as unknown as StaffTicket;
  return { ...t, support_messages: [...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) };
}

export async function listAudit(p: ListParams) {
  const [from, to] = range(p.page);
  let q = (await createClient()).from("admin_audit_logs").select("id, actor_id, action, target_table, target_id, details, ip_address, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (p.q) q = q.ilike("action", like(p.q));
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return pageOf(data, count, p.page);
}

/** Emails for a page of user ids (for tables), via a staff-only function. */
export async function emailsFor(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (!unique.length) return new Map();
  const { data } = await (await createClient()).rpc("admin_user_emails", { p_ids: unique });
  return new Map(((data ?? []) as Array<{ id: string; email: string }>).map((r) => [r.id, r.email]));
}
