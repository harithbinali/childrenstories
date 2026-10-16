"use server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/auth/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATALOG_TAG } from "@/lib/catalog";
import { PUBLIC_SETTINGS_TAG } from "@/lib/public-settings";
import { MARKETING_TAG } from "@/lib/marketing-content";
import { invalidateAiSettingsCache } from "@/lib/ai/settings";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { fromDecimalString } from "@/lib/payments/money";
import { refundOrder } from "@/lib/payments/checkout";
import { hasEnv } from "@/lib/env";
import { fail, ok, run, type ActionResult } from "@/lib/actions/result";
import { isInternalHref, parseFaqs, validImageSize } from "./validate";

/**
 * Admin mutations. Every action re-checks the caller's role on the server,
 * validates input, writes with the service role and records an audit entry.
 * Staff: operations (jobs, support). Admin: everything else.
 */
type R = Promise<ActionResult<undefined>>;
const uuid = z.string().uuid();
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const done = (path: string) => { revalidatePath(`/admin${path}`, "page"); return ok(undefined); };

// ---------------------------------------------------------------- jobs (staff)

/** Re-queues a failed or cancelled job and restores the state its failure changed. */
export async function retryJob(jobId: string): R {
  return run(async () => {
    const user = await requireStaff();
    if (!uuid.safeParse(jobId).success) return fail("invalid_input");
    const db = createAdminClient();
    const { data: job } = await db.from("generation_jobs").update({ status: "queued", attempts: 0, run_after: new Date().toISOString(), locked_by: null, locked_until: null })
      .eq("id", jobId).in("status", ["failed", "cancelled"]).select("id, type, book_id, character_id").maybeSingle();
    if (!job) return fail("wrong_state");
    if (job.type === "character_generate" && job.character_id) await db.from("characters").update({ status: "generating" }).eq("id", job.character_id).eq("status", "failed");
    if (job.type === "story_generate" && job.book_id) await db.from("books").update({ status: "story_generating" }).eq("id", job.book_id).eq("status", "failed");
    await audit(user.id, "job.retry", { table: "generation_jobs", id: jobId }, { type: job.type });
    return done("/jobs");
  });
}

export async function cancelJob(jobId: string): R {
  return run(async () => {
    const user = await requireStaff();
    if (!uuid.safeParse(jobId).success) return fail("invalid_input");
    const { data } = await createAdminClient().from("generation_jobs").update({ status: "cancelled", locked_by: null, locked_until: null }).eq("id", jobId).eq("status", "queued").select("id");
    if (!data?.length) return fail("wrong_state");
    await audit(user.id, "job.cancel", { table: "generation_jobs", id: jobId });
    return done("/jobs");
  });
}

export async function retryBookJobs(bookId: string): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    await requireStaff();
    if (!uuid.safeParse(bookId).success) return fail("invalid_input");
    const { data } = await createAdminClient().from("generation_jobs").select("id").eq("book_id", bookId).eq("status", "failed");
    let count = 0;
    for (const j of data ?? []) if ((await retryJob(j.id)).ok) count++;
    revalidatePath("/admin/books", "page");
    return ok({ count });
  });
}

// ------------------------------------------------------------- support (staff)

export async function staffReply(ticketId: string, _: unknown, form: FormData): R {
  return run(async () => {
    const user = await requireStaff();
    const body = z.string().trim().min(1).max(5000).safeParse(form.get("body"));
    if (!body.success || !uuid.safeParse(ticketId).success) return fail("invalid_input");
    const db = createAdminClient();
    const { data: t } = await db.from("support_tickets").select("id, owner_id, status").eq("id", ticketId).single();
    if (!t) return fail("not_found");
    if (t.status === "closed") return fail("ticket_closed");
    const { data: msg, error } = await db.from("support_messages").insert({ ticket_id: ticketId, author_id: user.id, is_staff: true, body: body.data }).select("id").single();
    if (error || !msg) throw new Error(error?.message);
    await db.from("support_tickets").update({ status: "awaiting_customer" }).eq("id", ticketId);
    // Whoever answers an unassigned ticket takes it.
    await db.from("support_tickets").update({ assigned_to: user.id }).eq("id", ticketId).is("assigned_to", null);
    if (t.owner_id) {
      await enqueueJob({ type: "send_email", ownerId: t.owner_id, payload: { template: "support_reply", ticket_id: ticketId }, idempotencyKey: `email:support_reply:${msg.id}`, priority: 5 });
    }
    await audit(user.id, "support.reply", { table: "support_tickets", id: ticketId });
    return done(`/support/${ticketId}`);
  });
}

const TicketUpdate = z.object({
  status: z.enum(["open", "awaiting_customer", "awaiting_staff", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assign: z.enum(["me", "none"]).optional(),
});

export async function updateTicket(ticketId: string, change: z.input<typeof TicketUpdate>): R {
  return run(async () => {
    const user = await requireStaff();
    const c = TicketUpdate.safeParse(change);
    if (!c.success || !uuid.safeParse(ticketId).success) return fail("invalid_input");
    const patch: Record<string, unknown> = {};
    if (c.data.status) { patch.status = c.data.status; patch.closed_at = c.data.status === "closed" ? new Date().toISOString() : null; }
    if (c.data.priority) patch.priority = c.data.priority;
    if (c.data.assign) patch.assigned_to = c.data.assign === "me" ? user.id : null;
    const { data } = await createAdminClient().from("support_tickets").update(patch).eq("id", ticketId).select("id");
    if (!data?.length) return fail("not_found");
    await audit(user.id, "support.update", { table: "support_tickets", id: ticketId }, c.data);
    return done(`/support/${ticketId}`);
  });
}

// ------------------------------------------------------------ customers (admin)

export async function suspendCustomer(userId: string, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const reason = str(form, "reason").slice(0, 500);
    if (!uuid.safeParse(userId).success || !reason) return fail("invalid_input");
    if (userId === admin.id) return fail("forbidden");
    const db = createAdminClient();
    const { error } = await db.from("profiles").update({ status: "suspended", suspended_reason: reason }).eq("id", userId).eq("status", "active");
    if (error) throw new Error(error.message);
    // Ends existing sessions at their next refresh and blocks new sign-ins.
    await db.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    await audit(admin.id, "customer.suspend", { table: "profiles", id: userId }, { reason });
    return done(`/customers/${userId}`);
  });
}

export async function restoreCustomer(userId: string): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (!uuid.safeParse(userId).success) return fail("invalid_input");
    const db = createAdminClient();
    const { data } = await db.from("profiles").update({ status: "active", suspended_reason: null }).eq("id", userId).eq("status", "suspended").select("id");
    if (!data?.length) return fail("wrong_state");
    await db.auth.admin.updateUserById(userId, { ban_duration: "none" });
    await audit(admin.id, "customer.restore", { table: "profiles", id: userId });
    return done(`/customers/${userId}`);
  });
}

const BUCKETS = ["child-photos", "character-refs", "illustrations", "book-pdfs"] as const;

/** Removes every private file under the user's folder (paths always start with their id). */
async function purgeUserFiles(userId: string) {
  const storage = createAdminClient().storage;
  for (const bucket of BUCKETS) {
    const { data: folders } = await storage.from(bucket).list(userId, { limit: 1000 });
    for (const folder of folders ?? []) {
      const { data: files } = await storage.from(bucket).list(`${userId}/${folder.name}`, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${userId}/${folder.name}/${f.name}`);
      if (paths.length) await storage.from(bucket).remove(paths);
    }
  }
}

/** Executes a deletion request after its grace period: files, then the auth user (rows cascade). */
export async function processDeletion(requestId: string): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (!uuid.safeParse(requestId).success) return fail("invalid_input");
    const db = createAdminClient();
    const { data: req } = await db.from("account_deletion_requests").update({ status: "processing", processed_by: admin.id })
      .eq("id", requestId).eq("status", "pending").lte("scheduled_for", new Date().toISOString()).select("id, user_id").maybeSingle();
    if (!req?.user_id) return fail("wrong_state");
    if (req.user_id === admin.id) return fail("forbidden");
    await purgeUserFiles(req.user_id);
    // Orders stay for accounting, without the email address.
    await db.from("orders").update({ customer_email: null }).eq("owner_id", req.user_id);
    const { error } = await db.auth.admin.deleteUser(req.user_id);
    if (error) {
      await db.from("account_deletion_requests").update({ status: "pending" }).eq("id", requestId);
      throw new Error(`could not delete auth user: ${error.message}`);
    }
    await db.from("account_deletion_requests").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", requestId);
    await audit(admin.id, "customer.delete", { table: "account_deletion_requests", id: requestId }, { user_id: req.user_id });
    return done("/customers");
  });
}

export async function rejectDeletion(requestId: string): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (!uuid.safeParse(requestId).success) return fail("invalid_input");
    const { data } = await createAdminClient().from("account_deletion_requests").update({ status: "rejected", processed_at: new Date().toISOString(), processed_by: admin.id })
      .eq("id", requestId).eq("status", "pending").select("user_id");
    if (!data?.length) return fail("wrong_state");
    await audit(admin.id, "customer.deletion_rejected", { table: "account_deletion_requests", id: requestId });
    return done(`/customers/${data[0].user_id}`);
  });
}

// --------------------------------------------------------------- refunds (admin)

export async function issueRefund(orderId: string, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const reason = str(form, "reason").slice(0, 500);
    if (!uuid.safeParse(orderId).success || !reason) return fail("invalid_input");
    const { data: order } = await createAdminClient().from("orders").select("currency, gateway").eq("id", orderId).single();
    if (!order?.gateway) return fail("wrong_state");
    if (order.gateway === "stripe" ? !hasEnv("STRIPE_SECRET_KEY") : !hasEnv("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET")) return fail("not_configured");
    let amount: number;
    try { amount = fromDecimalString(str(form, "amount"), order.currency); } catch { return fail("invalid_input"); }
    try {
      await refundOrder({ actorId: admin.id, orderId, amount, reason });
    } catch (e) {
      if (e instanceof Error && /refundable|invalid refund amount|no captured payment/.test(e.message)) return fail("wrong_state");
      throw e;
    }
    return done(`/orders/${orderId}`);
  });
}

// --------------------------------------------------------------- catalog (admin)

const Money = z.string().regex(/^\d+(\.\d{1,3})?$/);
const Currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);

export async function saveProduct(id: string | null, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const p = z.object({
      sku: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/), name_en: z.string().trim().min(1).max(80), name_ar: z.string().trim().min(1).max(80),
      page_count: z.coerce.number().int().refine((n) => [8, 12, 16].includes(n)), price: Money, currency: Currency,
      free_preview_pages: int(0, 16), included_regenerations: int(0, 100), sort_order: int(0, 1000),
    }).safeParse(Object.fromEntries(form));
    if (!p.success) return fail("invalid_input");
    const { price, ...rest } = p.data;
    const row = { ...rest, price_amount: fromDecimalString(price, rest.currency), is_active: bool(form, "is_active") };
    const db = createAdminClient();
    const { data, error } = id ? await db.from("book_products").update(row).eq("id", id).select("id").single() : await db.from("book_products").insert(row).select("id").single();
    if (error?.code === "23505") return fail("invalid_input");
    if (error || !data) throw new Error(error?.message);
    await audit(admin.id, id ? "product.update" : "product.create", { table: "book_products", id: data.id }, row);
    updateTag(CATALOG_TAG);
    return done("/products");
  });
}

export async function saveDiscount(_: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const d = z.object({
      code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/), percent_off: z.string().optional(), amount_off: z.string().optional(), currency: z.string().optional(),
      max_redemptions: z.string().optional(), starts_at: z.string().optional(), expires_at: z.string().optional(),
    }).safeParse(Object.fromEntries(form));
    if (!d.success) return fail("invalid_input");
    const percent = d.data.percent_off ? Number(d.data.percent_off) : null;
    const currency = d.data.currency ? Currency.safeParse(d.data.currency) : null;
    let amount: number | null = null;
    if (d.data.amount_off) {
      if (!currency?.success) return fail("invalid_input");
      try { amount = fromDecimalString(d.data.amount_off, currency.data); } catch { return fail("invalid_input"); }
    }
    if ((percent === null) === (amount === null)) return fail("invalid_input");
    if (percent !== null && (!Number.isInteger(percent) || percent < 1 || percent > 100)) return fail("invalid_input");
    const dates = [d.data.starts_at, d.data.expires_at].map((v) => (v ? new Date(v) : null));
    if (dates.some((x) => x && Number.isNaN(x.getTime()))) return fail("invalid_input");
    const row = {
      code: d.data.code, percent_off: percent, amount_off: amount, currency: amount !== null && currency?.success ? currency.data : null,
      max_redemptions: d.data.max_redemptions ? Number(d.data.max_redemptions) : null, starts_at: dates[0]?.toISOString() ?? null, expires_at: dates[1]?.toISOString() ?? null, is_active: true,
    };
    const { data, error } = await createAdminClient().from("discount_codes").insert(row).select("id").single();
    if (error?.code === "23505" || error?.code === "23514") return fail("invalid_input");
    if (error || !data) throw new Error(error?.message);
    await audit(admin.id, "discount.create", { table: "discount_codes", id: data.id }, row);
    return done("/products");
  });
}

export async function setDiscountActive(id: string, active: boolean): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (!uuid.safeParse(id).success) return fail("invalid_input");
    await createAdminClient().from("discount_codes").update({ is_active: active }).eq("id", id);
    await audit(admin.id, active ? "discount.enable" : "discount.disable", { table: "discount_codes", id });
    return done("/products");
  });
}

const Slug = z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/);
const Catalog = {
  slug: Slug, name_en: z.string().trim().min(1).max(80), name_ar: z.string().trim().min(1).max(80),
  description_en: z.string().trim().max(400), description_ar: z.string().trim().max(400), sort_order: int(0, 1000),
};

export async function saveTheme(id: string | null, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const t = z.object({ ...Catalog, prompt_guidance: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(form));
    if (!t.success) return fail("invalid_input");
    const row = { ...t.data, is_active: bool(form, "is_active"), is_featured: bool(form, "is_featured"), is_custom: bool(form, "is_custom") };
    const db = createAdminClient();
    const { data, error } = id ? await db.from("story_themes").update(row).eq("id", id).select("id").single() : await db.from("story_themes").insert(row).select("id").single();
    if (error?.code === "23505") return fail("invalid_input");
    if (error || !data) throw new Error(error?.message);
    await audit(admin.id, id ? "theme.update" : "theme.create", { table: "story_themes", id: data.id }, { slug: row.slug, is_active: row.is_active });
    updateTag(CATALOG_TAG);
    return done("/themes");
  });
}

export async function saveStyle(id: string | null, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const s = z.object({ ...Catalog, prompt_template: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(form));
    if (!s.success) return fail("invalid_input");
    const row = { ...s.data, is_active: bool(form, "is_active") };
    const db = createAdminClient();
    const { data, error } = id ? await db.from("illustration_styles").update(row).eq("id", id).select("id").single() : await db.from("illustration_styles").insert(row).select("id").single();
    if (error?.code === "23505") return fail("invalid_input");
    if (error || !data) throw new Error(error?.message);
    await audit(admin.id, id ? "style.update" : "style.create", { table: "illustration_styles", id: data.id }, { slug: row.slug, is_active: row.is_active });
    updateTag(CATALOG_TAG);
    return done("/styles");
  });
}

// ------------------------------------------------------------------- AI (admin)

const Size = z.string().regex(/^\d{3,4}x\d{3,4}$/);
const Quality = z.enum(["low", "medium", "high"]);

export async function saveAiSetting(purpose: string, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (!["story", "story_fast", "image", "moderation"].includes(purpose)) return fail("invalid_input");
    const base = z.object({ model: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9._:-]+$/), timeout_s: int(5, 900), max_retries: int(0, 5), pricing: z.string().max(4000) }).safeParse(Object.fromEntries(form));
    if (!base.success) return fail("invalid_input");
    let pricing: Record<string, unknown>;
    try { pricing = JSON.parse(base.data.pricing || "{}"); } catch { return fail("invalid_input"); }
    if (typeof pricing !== "object" || pricing === null || Array.isArray(pricing)) return fail("invalid_input");

    const db = createAdminClient();
    const { data: current } = await db.from("ai_model_settings").select("params").eq("purpose", purpose).single();
    const params: Record<string, unknown> = { ...(current?.params ?? {}) };
    if (purpose === "image") {
      const q = z.object({ preview_quality: Quality, final_quality: Quality, portrait_size: Size, landscape_size: Size }).safeParse(Object.fromEntries(form));
      if (!q.success || !validImageSize(q.data.portrait_size, "portrait") || !validImageSize(q.data.landscape_size, "landscape")) return fail("invalid_input");
      Object.assign(params, q.data);
    }
    if (purpose === "story" || purpose === "story_fast") {
      const r = z.enum(["", "minimal", "low", "medium", "high"]).safeParse(str(form, "reasoning_effort"));
      if (!r.success) return fail("invalid_input");
      if (r.data) params.reasoning_effort = r.data; else delete params.reasoning_effort;
    }
    const row = { model: base.data.model, timeout_ms: base.data.timeout_s * 1000, max_retries: base.data.max_retries, pricing, params, updated_by: admin.id };
    const { error } = await db.from("ai_model_settings").update(row).eq("purpose", purpose);
    if (error) throw new Error(error.message);
    invalidateAiSettingsCache();
    await audit(admin.id, "ai.update", { table: "ai_model_settings", id: purpose }, { model: row.model, params, timeout_ms: row.timeout_ms, max_retries: row.max_retries });
    return done("/ai");
  });
}

// ---------------------------------------------------------- settings (admin)

/** Numeric platform settings; only whitelisted keys, each within a sane range. */
const NUMERIC: Record<string, [number, number]> = {
  "limits.free_character_attempts": [0, 50], "limits.free_story_attempts": [0, 50], "limits.free_illustration_previews": [0, 16],
  "limits.daily_image_generations_per_user": [0, 1000], "limits.daily_text_generations_per_user": [0, 1000], "limits.max_concurrent_jobs_per_user": [1, 20],
  "limits.daily_platform_spend_usd": [0, 100000], "limits.worker_concurrency": [1, 32], "retention.child_photo_days": [0, 365],
};

async function writeSettings(adminId: string, values: Record<string, unknown>, path: string) {
  const db = createAdminClient();
  for (const [key, value] of Object.entries(values)) {
    const { error } = await db.from("platform_settings").upsert({ key, value, updated_by: adminId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  await audit(adminId, "settings.update", { table: "platform_settings", id: Object.keys(values).join(",") }, values);
  updateTag(PUBLIC_SETTINGS_TAG);
  return done(path);
}

export async function saveNumericSettings(path: string, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const values: Record<string, number> = {};
    for (const [key, raw] of form.entries()) {
      if (key.startsWith("$")) continue; // React's action metadata
      const range = NUMERIC[key];
      const n = Number(raw);
      if (!range || !Number.isFinite(n) || n < range[0] || n > range[1]) return fail("invalid_input");
      values[key] = key === "limits.daily_platform_spend_usd" ? Math.round(n * 100) / 100 : Math.round(n);
    }
    if (!Object.keys(values).length) return fail("invalid_input");
    return writeSettings(admin.id, values, ["/limits", "/ai", "/settings"].includes(path) ? path : "/settings");
  });
}

export async function savePlatformSettings(_: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    const s = z.object({ brand: z.string().trim().min(1).max(40), email: z.email().max(120), retention: int(0, 365) })
      .safeParse({ brand: form.get("brand.name"), email: form.get("brand.support_email"), retention: form.get("retention.child_photo_days") });
    if (!s.success) return fail("invalid_input");
    return writeSettings(admin.id, {
      "brand.name": s.data.brand, "brand.support_email": s.data.email, "retention.child_photo_days": s.data.retention,
      "features.google_auth": bool(form, "features.google_auth"), "features.design_system_public": bool(form, "features.design_system_public"),
    }, "/settings");
  });
}

export async function saveGateway(gateway: string, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (gateway !== "stripe" && gateway !== "paypal") return fail("invalid_input");
    const currencies = str(form, "supported_currencies").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (!currencies.length || currencies.some((c) => !/^[A-Z]{3}$/.test(c))) return fail("invalid_input");
    const enabled = bool(form, "is_enabled");
    const configured = gateway === "stripe" ? hasEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET") : hasEnv("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID");
    if (enabled && !configured) return fail("not_configured");
    const isDefault = bool(form, "is_default");
    const db = createAdminClient();
    if (isDefault) await db.from("payment_gateway_configs").update({ is_default: false }).neq("gateway", gateway);
    const { error } = await db.from("payment_gateway_configs").update({ is_enabled: enabled, is_default: isDefault, supported_currencies: currencies, updated_by: admin.id }).eq("gateway", gateway);
    if (error) throw new Error(error.message);
    await audit(admin.id, "gateway.update", { table: "payment_gateway_configs", id: gateway }, { enabled, isDefault, currencies });
    return done("/gateways");
  });
}

// ------------------------------------------------------------ content (admin)

export async function saveMarketingContent(locale: string, _: unknown, form: FormData): R {
  return run(async () => {
    const admin = await requireAdmin();
    if (locale !== "en" && locale !== "ar") return fail("invalid_input");
    const max = (k: string, n: number) => str(form, k).slice(0, n);
    const faqs = parseFaqs(String(form.get("faqs") ?? ""));
    const href = max("banner.href", 200);
    if (href && !isInternalHref(href)) return fail("invalid_input"); // internal links only
    const blocks: Record<string, Record<string, unknown> | unknown[]> = {
      "home.hero": { eyebrow: max("hero.eyebrow", 80), h1a: max("hero.h1a", 60), h1b: max("hero.h1b", 60), h1c: max("hero.h1c", 60), sub: max("hero.sub", 300), cta: max("hero.cta", 40) },
      "home.pricing": { title: max("pricing.title", 80), sub: max("pricing.sub", 300) },
      "home.faqs": faqs,
      "site.banner": { text: max("banner.text", 160), href, enabled: bool(form, "banner.enabled") },
      "site.contact": { email: max("contact.email", 120), address: max("contact.address", 300) },
    };
    const db = createAdminClient();
    for (const [key, content] of Object.entries(blocks)) {
      const { error } = await db.from("marketing_content").upsert({ key, locale, content, is_published: true, updated_by: admin.id }, { onConflict: "key,locale" });
      if (error) throw new Error(error.message);
    }
    await audit(admin.id, "content.update", { table: "marketing_content", id: locale });
    updateTag(MARKETING_TAG);
    return done("/content");
  });
}
