import { NextResponse, type NextRequest } from "next/server";
import { verifyPaypalWebhook } from "@/lib/payments/paypal";
import { paypalEventToAction } from "@/lib/payments/webhook-actions";
import { applyPaymentAction, beginWebhookEvent, finishWebhookEvent } from "@/lib/payments/apply";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let event: Parameters<typeof paypalEventToAction>[0];
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!(await verifyPaypalWebhook(request.headers, raw))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (!(await beginWebhookEvent("paypal", event.id, event.event_type, event))) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  try {
    const result = await applyPaymentAction("paypal", paypalEventToAction(event));
    await finishWebhookEvent("paypal", event.id);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    await finishWebhookEvent("paypal", event.id, e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
