import type Stripe from "stripe";
import { fromDecimalString } from "./money";

/**
 * Pure mapping from gateway webhook events to payment actions. The webhook
 * routes verify signatures, de-duplicate events, then apply these actions
 * through idempotent database functions.
 */
export type PaymentAction =
  | { type: "mark_paid"; orderId: string; gatewayPaymentId: string; amount: number; currency: string }
  | { type: "mark_failed"; orderId: string; status: "failed" | "cancelled"; reason: string }
  | { type: "record_refund"; gatewayPaymentId: string; gatewayRefundId: string; amount: number; currency: string; status: "pending" | "succeeded" | "failed" | "cancelled"; orderId: string | null }
  | { type: "ignore"; reason: string };

export function stripeEventToAction(event: Stripe.Event): PaymentAction {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      const orderId = s.metadata?.order_id ?? s.client_reference_id;
      if (!orderId) return { type: "ignore", reason: "session without order id" };
      if (s.payment_status !== "paid") return { type: "ignore", reason: `payment_status=${s.payment_status}` };
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      if (!pi || s.amount_total === null || !s.currency) return { type: "ignore", reason: "session missing payment details" };
      return { type: "mark_paid", orderId, gatewayPaymentId: pi, amount: s.amount_total, currency: s.currency.toUpperCase() };
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const s = event.data.object;
      const orderId = s.metadata?.order_id ?? s.client_reference_id;
      if (!orderId) return { type: "ignore", reason: "session without order id" };
      return { type: "mark_failed", orderId, status: event.type === "checkout.session.expired" ? "cancelled" : "failed", reason: event.type };
    }
    case "refund.created":
    case "refund.updated":
    case "refund.failed": {
      const r = event.data.object;
      const pi = typeof r.payment_intent === "string" ? r.payment_intent : r.payment_intent?.id;
      if (!pi) return { type: "ignore", reason: "refund without payment_intent" };
      const status = r.status === "succeeded" ? "succeeded" : r.status === "failed" ? "failed" : r.status === "canceled" ? "cancelled" : "pending";
      return { type: "record_refund", gatewayPaymentId: pi, gatewayRefundId: r.id, amount: r.amount, currency: r.currency.toUpperCase(), status, orderId: r.metadata?.order_id ?? null };
    }
    default:
      return { type: "ignore", reason: `unhandled ${event.type}` };
  }
}

type PaypalAmount = { value?: string; currency_code?: string };
type PaypalEvent = {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: PaypalAmount;
    supplementary_data?: { related_ids?: { order_id?: string } };
    links?: Array<{ rel?: string; href?: string }>;
  };
};

export function paypalEventToAction(e: PaypalEvent): PaymentAction {
  const r = e.resource ?? {};
  switch (e.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      if (!r.custom_id || !r.id || !r.amount?.value || !r.amount.currency_code) return { type: "ignore", reason: "capture missing fields" };
      return { type: "mark_paid", orderId: r.custom_id, gatewayPaymentId: r.id, amount: fromDecimalString(r.amount.value, r.amount.currency_code), currency: r.amount.currency_code };
    }
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return r.custom_id ? { type: "mark_failed", orderId: r.custom_id, status: "failed", reason: e.event_type } : { type: "ignore", reason: "no custom_id" };
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.REFUND.COMPLETED":
    case "PAYMENT.REFUND.PENDING":
    case "PAYMENT.REFUND.FAILED":
    case "PAYMENT.REFUND.CANCELLED": {
      // Refund resource: the captured payment id is in the "up" link.
      const up = r.links?.find((l) => l.rel === "up")?.href ?? "";
      const captureId = /\/captures\/([^/?]+)/.exec(up)?.[1];
      if (!r.id || !captureId || !r.amount?.value || !r.amount.currency_code) return { type: "ignore", reason: "refund missing fields" };
      const status = r.status === "COMPLETED" ? "succeeded" : r.status === "FAILED" ? "failed" : r.status === "CANCELLED" ? "cancelled" : "pending";
      return {
        type: "record_refund", gatewayPaymentId: captureId, gatewayRefundId: r.id,
        amount: fromDecimalString(r.amount.value, r.amount.currency_code), currency: r.amount.currency_code, status, orderId: r.custom_id ?? null,
      };
    }
    default:
      return { type: "ignore", reason: `unhandled ${e.event_type}` };
  }
}
