import "@/lib/server-guard";
import Stripe from "stripe";
import { env } from "@/lib/env";
import type { CheckoutInput, PaymentGateway, RefundInput } from "./gateway";

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(env("STRIPE_SECRET_KEY"), { maxNetworkRetries: 2, appInfo: { name: "Storyling" } });
  return client;
}

export const stripeGateway: PaymentGateway = {
  id: "stripe",
  async createCheckout(i: CheckoutInput) {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: i.orderId,
        customer_email: i.customerEmail ?? undefined,
        locale: i.locale === "ar" ? "ar" : "en",
        line_items: [{ quantity: 1, price_data: { currency: i.currency.toLowerCase(), unit_amount: i.amount, product_data: { name: i.description } } }],
        metadata: { order_id: i.orderId, order_number: String(i.orderNumber) },
        payment_intent_data: { metadata: { order_id: i.orderId } },
        success_url: `${i.successUrl}${i.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: i.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      },
      { idempotencyKey: `checkout:${i.orderId}` },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { checkoutId: session.id, redirectUrl: session.url };
  },
  async refund(i: RefundInput) {
    const r = await stripe().refunds.create(
      { payment_intent: i.gatewayPaymentId, amount: i.amount, metadata: { order_id: i.orderId }, reason: "requested_by_customer" },
      { idempotencyKey: i.idempotencyKey },
    );
    return { gatewayRefundId: r.id, status: r.status === "succeeded" ? "succeeded" : r.status === "failed" || r.status === "canceled" ? "failed" : "pending" };
  },
};
