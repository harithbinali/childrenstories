import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { paypalEventToAction, stripeEventToAction } from "./webhook-actions";

const stripe = new Stripe("sk_test_dummy");
const secret = "whsec_test_secret";

function signed(event: object) {
  const payload = JSON.stringify(event);
  return { payload, header: stripe.webhooks.generateTestHeaderString({ payload, secret }) };
}

const session = (o: object) => ({
  id: "evt_1", object: "event", type: "checkout.session.completed",
  data: { object: { id: "cs_1", object: "checkout.session", client_reference_id: "ord_1", metadata: { order_id: "ord_1" }, payment_status: "paid", payment_intent: "pi_1", amount_total: 1900, currency: "usd", ...o } },
});

describe("Stripe webhooks", () => {
  it("verifies a genuine signature and maps a paid session to mark_paid", async () => {
    const { payload, header } = signed(session({}));
    const event = await stripe.webhooks.constructEventAsync(payload, header, secret);
    expect(stripeEventToAction(event)).toEqual({ type: "mark_paid", orderId: "ord_1", gatewayPaymentId: "pi_1", amount: 1900, currency: "USD" });
  });

  it("rejects a tampered payload", async () => {
    const { header } = signed(session({}));
    const tampered = JSON.stringify(session({ amount_total: 1 }));
    await expect(stripe.webhooks.constructEventAsync(tampered, header, secret)).rejects.toThrow();
  });

  it("rejects a signature made with another secret", async () => {
    const payload = JSON.stringify(session({}));
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_attacker" });
    await expect(stripe.webhooks.constructEventAsync(payload, header, secret)).rejects.toThrow();
  });

  it("does not mark unpaid (async) sessions as paid", () => {
    expect(stripeEventToAction(session({ payment_status: "unpaid" }) as unknown as Stripe.Event).type).toBe("ignore");
  });

  it("maps expiry to a cancelled order and refunds to record_refund", () => {
    expect(stripeEventToAction({ ...session({}), type: "checkout.session.expired" } as unknown as Stripe.Event)).toMatchObject({ type: "mark_failed", status: "cancelled" });
    const refund = { id: "evt_r", type: "refund.updated", data: { object: { id: "re_1", object: "refund", payment_intent: "pi_1", amount: 500, currency: "usd", status: "succeeded", metadata: {} } } };
    expect(stripeEventToAction(refund as unknown as Stripe.Event)).toEqual({ type: "record_refund", gatewayPaymentId: "pi_1", gatewayRefundId: "re_1", amount: 500, currency: "USD", status: "succeeded", orderId: null });
  });
});

describe("PayPal webhooks", () => {
  it("maps a completed capture to mark_paid with minor units", () => {
    expect(
      paypalEventToAction({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP1", status: "COMPLETED", custom_id: "ord_1", amount: { value: "19.00", currency_code: "USD" } } }),
    ).toEqual({ type: "mark_paid", orderId: "ord_1", gatewayPaymentId: "CAP1", amount: 1900, currency: "USD" });
  });
  it("maps a refund using the capture id from the 'up' link", () => {
    expect(
      paypalEventToAction({
        id: "WH-2", event_type: "PAYMENT.REFUND.COMPLETED",
        resource: { id: "REF1", status: "COMPLETED", amount: { value: "5.00", currency_code: "USD" }, links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAP1" }] },
      }),
    ).toMatchObject({ type: "record_refund", gatewayPaymentId: "CAP1", gatewayRefundId: "REF1", amount: 500, status: "succeeded" });
  });
});
