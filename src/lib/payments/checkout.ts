import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { audit } from "@/lib/auth/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { computeOrderTotals, type DiscountCode, type Product } from "./pricing";
import type { GatewayId, PaymentGateway } from "./gateway";
import { stripe, stripeGateway } from "./stripe";
import { paypalGateway } from "./paypal";

const GATEWAYS: Record<GatewayId, PaymentGateway> = { stripe: stripeGateway, paypal: paypalGateway };

export class CheckoutError extends Error {
  constructor(public readonly code: "not_found" | "not_ready" | "already_paid" | "gateway_unavailable" | "product_unavailable" | "invalid_discount" | "zero_total") {
    super(code);
  }
}

const PURCHASABLE = new Set(["story_ready", "story_approved", "illustrating", "preview_ready"]);

/**
 * Creates (or reuses) a pending order for a book and starts a gateway
 * checkout. Prices come from book_products only; the client sends ids.
 */
export async function startCheckout(input: { bookId: string; gateway: GatewayId; discountCode?: string | null }): Promise<{ redirectUrl: string; orderId: string }> {
  const user = await requireUser();
  await enforceRateLimit(`checkout:${user.id}`, 10, 600);
  const db = createAdminClient();

  const [{ data: book }, { data: gw }] = await Promise.all([
    db.from("books").select("id, owner_id, status, page_count, title, current_version_id").eq("id", input.bookId).single(),
    db.from("payment_gateway_configs").select("gateway, is_enabled, supported_currencies").eq("gateway", input.gateway).single(),
  ]);
  if (!book || book.owner_id !== user.id) throw new CheckoutError("not_found");
  if (!PURCHASABLE.has(book.status) || !book.current_version_id) throw new CheckoutError("not_ready");
  if (!gw?.is_enabled) throw new CheckoutError("gateway_unavailable");

  const { data: existing } = await db
    .from("orders")
    .select("id, status, gateway, gateway_checkout_id, created_at")
    .eq("book_id", book.id)
    .in("status", ["pending", "processing", "paid", "partially_refunded"])
    .maybeSingle();
  if (existing && ["paid", "partially_refunded"].includes(existing.status)) throw new CheckoutError("already_paid");
  if (existing) {
    // Replace an abandoned checkout. Expire the old Stripe session so the old
    // tab can't be paid; if it was paid anyway, mark_order_paid handles it.
    if (existing.gateway === "stripe" && existing.gateway_checkout_id) {
      await stripe().checkout.sessions.expire(existing.gateway_checkout_id).catch(() => undefined);
    }
    await db.from("orders").update({ status: "cancelled" }).eq("id", existing.id).in("status", ["pending", "processing"]);
  }

  const { data: products } = await db
    .from("book_products")
    .select("id, price_amount, currency, is_active, page_count, name_en")
    .eq("page_count", book.page_count)
    .eq("is_active", true)
    .in("currency", gw.supported_currencies);
  const product = products?.[0] as (Product & { name_en: string }) | undefined;
  if (!product) throw new CheckoutError("product_unavailable");

  let discount: DiscountCode | null = null;
  if (input.discountCode?.trim()) {
    const { data } = await db.from("discount_codes").select("*").eq("code", input.discountCode.trim()).maybeSingle();
    if (!data) throw new CheckoutError("invalid_discount");
    discount = data as DiscountCode;
  }
  const totals = computeOrderTotals(product, discount);
  if (discount && totals.discountRejected) throw new CheckoutError("invalid_discount");
  if (totals.total <= 0) throw new CheckoutError("zero_total");

  const { data: order, error } = await db
    .from("orders")
    .insert({
      owner_id: user.id, book_id: book.id, status: "pending", currency: totals.currency,
      subtotal_amount: totals.subtotal, discount_amount: totals.discount, total_amount: totals.total,
      discount_code_id: totals.discountCodeId, gateway: input.gateway, customer_email: user.email,
    })
    .select("id, order_number")
    .single();
  if (error || !order) throw new Error(`could not create order: ${error?.message}`);
  await db.from("order_items").insert({
    order_id: order.id, product_id: product.id, description: product.name_en, page_count: product.page_count,
    quantity: 1, unit_amount: product.price_amount, currency: totals.currency,
  });

  const site = env("NEXT_PUBLIC_SITE_URL");
  const session = await GATEWAYS[input.gateway].createCheckout({
    orderId: order.id,
    orderNumber: order.order_number,
    amount: totals.total,
    currency: totals.currency,
    description: `${product.name_en}${book.title ? ` — ${book.title}` : ""}`.slice(0, 120),
    customerEmail: user.email,
    locale: user.locale,
    successUrl: input.gateway === "paypal" ? `${site}/api/payments/paypal/return` : `${site}/dashboard/books/${book.id}?payment=success`,
    cancelUrl: `${site}/dashboard/books/${book.id}?payment=cancelled`,
  });
  await db.from("orders").update({ gateway_checkout_id: session.checkoutId, status: "processing" }).eq("id", order.id);
  return { redirectUrl: session.redirectUrl, orderId: order.id };
}

/** Admin-initiated refund. The gateway's webhook confirms the final state. */
export async function refundOrder(args: { actorId: string; orderId: string; amount: number; reason: string }) {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, status, total_amount, refunded_amount, currency, gateway").eq("id", args.orderId).single();
  if (!order || !order.gateway || !["paid", "partially_refunded"].includes(order.status)) throw new Error("order is not refundable");
  if (!Number.isInteger(args.amount) || args.amount <= 0 || args.amount > order.total_amount - order.refunded_amount) throw new Error("invalid refund amount");
  const { data: payment } = await db.from("payments").select("gateway_payment_id").eq("order_id", order.id).in("status", ["paid", "partially_refunded"]).order("created_at", { ascending: false }).limit(1).single();
  if (!payment) throw new Error("no captured payment");

  const { count } = await db.from("refunds").select("id", { count: "exact", head: true }).eq("order_id", order.id);
  const result = await GATEWAYS[order.gateway as GatewayId].refund({
    orderId: order.id, gatewayPaymentId: payment.gateway_payment_id, amount: args.amount, currency: order.currency,
    reason: args.reason, idempotencyKey: `refund-${order.id}-${(count ?? 0) + 1}-${args.amount}`,
  });
  const { data, error } = await db.rpc("record_refund", {
    p_order_id: order.id, p_gateway_refund_id: result.gatewayRefundId, p_amount: args.amount, p_currency: order.currency,
    p_status: result.status, p_reason: args.reason, p_requested_by: args.actorId,
  });
  if (error) throw new Error(`refund recorded at gateway but not locally: ${error.message}`);
  await audit(args.actorId, "order.refund", { table: "orders", id: order.id }, { amount: args.amount, reason: args.reason, gateway_refund_id: result.gatewayRefundId, status: result.status });
  return data;
}
