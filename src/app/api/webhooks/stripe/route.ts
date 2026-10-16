import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { stripe } from "@/lib/payments/stripe";
import { stripeEventToAction } from "@/lib/payments/webhook-actions";
import { applyPaymentAction, beginWebhookEvent, finishWebhookEvent } from "@/lib/payments/apply";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (!(await beginWebhookEvent("stripe", event.id, event.type, event))) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  try {
    const result = await applyPaymentAction("stripe", stripeEventToAction(event));
    await finishWebhookEvent("stripe", event.id);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finishWebhookEvent("stripe", event.id, message);
    // 500 => Stripe retries with backoff; processing is idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
