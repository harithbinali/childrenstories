import "@/lib/server-guard";
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  PaypalExperienceUserAction,
  PaypalExperienceLandingPage,
  PaypalWalletContextShippingPreference,
} from "@paypal/paypal-server-sdk";
import { env } from "@/lib/env";
import type { CheckoutInput, PaymentGateway, RefundInput } from "./gateway";
import { toDecimalString } from "./money";

let client: Client | null = null;
function paypal(): Client {
  client ??= new Client({
    clientCredentialsAuthCredentials: { oAuthClientId: env("PAYPAL_CLIENT_ID"), oAuthClientSecret: env("PAYPAL_CLIENT_SECRET") },
    environment: env("PAYPAL_ENVIRONMENT") === "live" ? Environment.Production : Environment.Sandbox,
    timeout: 30_000,
  });
  return client;
}

export const paypalApiBase = () => (env("PAYPAL_ENVIRONMENT") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export const paypalGateway: PaymentGateway = {
  id: "paypal",
  async createCheckout(i: CheckoutInput) {
    const { result } = await new OrdersController(paypal()).createOrder({
      paypalRequestId: `checkout-${i.orderId}`,
      prefer: "return=minimal",
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            referenceId: i.orderId,
            customId: i.orderId,
            invoiceId: `SL-${i.orderNumber}`,
            description: i.description.slice(0, 127),
            amount: { currencyCode: i.currency, value: toDecimalString(i.amount, i.currency) },
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              returnUrl: i.successUrl,
              cancelUrl: i.cancelUrl,
              userAction: PaypalExperienceUserAction.PayNow,
              landingPage: PaypalExperienceLandingPage.Login,
              shippingPreference: PaypalWalletContextShippingPreference.NoShipping,
              locale: i.locale === "ar" ? "ar-EG" : "en-US",
            },
          },
        },
      },
    });
    const approve = result.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!result.id || !approve) throw new Error("PayPal did not return an approval link");
    return { checkoutId: result.id, redirectUrl: approve };
  },

  async refund(i: RefundInput) {
    const { result } = await new PaymentsController(paypal()).refundCapturedPayment({
      captureId: i.gatewayPaymentId,
      paypalRequestId: i.idempotencyKey,
      prefer: "return=representation",
      body: { amount: { currencyCode: i.currency, value: toDecimalString(i.amount, i.currency) }, customId: i.orderId, noteToPayer: i.reason?.slice(0, 255) },
    });
    if (!result.id) throw new Error("PayPal refund returned no id");
    const s = result.status as string | undefined;
    return { gatewayRefundId: result.id, status: s === "COMPLETED" ? "succeeded" : s === "FAILED" || s === "CANCELLED" ? "failed" : "pending" };
  },
};

/** Server-side capture after the buyer approves. The response is authoritative. */
export async function capturePaypalOrder(paypalOrderId: string) {
  const { result } = await new OrdersController(paypal()).captureOrder({
    id: paypalOrderId,
    paypalRequestId: `capture-${paypalOrderId}`,
    prefer: "return=representation",
  });
  const unit = result.purchaseUnits?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    status: result.status as string | undefined,
    orderId: unit?.customId ?? unit?.referenceId ?? null,
    captureId: capture?.id ?? null,
    captureStatus: capture?.status as string | undefined,
    amount: capture?.amount?.value ?? null,
    currency: capture?.amount?.currencyCode ?? null,
  };
}

async function accessToken(): Promise<string> {
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env("PAYPAL_CLIENT_ID")}:${env("PAYPAL_CLIENT_SECRET")}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Verifies a webhook with PayPal's verify-webhook-signature API. */
export async function verifyPaypalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const h = (k: string) => headers.get(k) ?? "";
  if (!h("paypal-transmission-id") || !h("paypal-transmission-sig")) return false;
  const res = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    // webhook_event must be the exact received JSON; splice it in as raw text.
    body: `{"auth_algo":${JSON.stringify(h("paypal-auth-algo"))},"cert_url":${JSON.stringify(h("paypal-cert-url"))},"transmission_id":${JSON.stringify(h("paypal-transmission-id"))},"transmission_sig":${JSON.stringify(h("paypal-transmission-sig"))},"transmission_time":${JSON.stringify(h("paypal-transmission-time"))},"webhook_id":${JSON.stringify(env("PAYPAL_WEBHOOK_ID"))},"webhook_event":${rawBody}}`,
  });
  if (!res.ok) return false;
  return ((await res.json()) as { verification_status?: string }).verification_status === "SUCCESS";
}
