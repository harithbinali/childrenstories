import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capturePaypalOrder } from "@/lib/payments/paypal";
import { applyPaymentAction } from "@/lib/payments/apply";
import { fromDecimalString } from "@/lib/payments/money";

/**
 * PayPal redirects the buyer here after approval (?token=<paypal order id>).
 * We capture server-to-server; the capture response is authoritative, and
 * the PAYMENT.CAPTURE.COMPLETED webhook is a safe, idempotent backup.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const site = request.nextUrl.origin;
  if (!token) return NextResponse.redirect(`${site}/dashboard/orders?payment=missing`);

  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, book_id, status").eq("gateway", "paypal").eq("gateway_checkout_id", token).maybeSingle();
  if (!order) return NextResponse.redirect(`${site}/dashboard/orders?payment=unknown`);
  if (order.status === "paid") return NextResponse.redirect(`${site}/dashboard/books/${order.book_id}?payment=success`);

  try {
    const c = await capturePaypalOrder(token);
    if (c.status === "COMPLETED" && c.captureStatus === "COMPLETED" && c.captureId && c.amount && c.currency && c.orderId === order.id) {
      await applyPaymentAction("paypal", { type: "mark_paid", orderId: order.id, gatewayPaymentId: c.captureId, amount: fromDecimalString(c.amount, c.currency), currency: c.currency });
      return NextResponse.redirect(`${site}/dashboard/books/${order.book_id}?payment=success`);
    }
    // PENDING captures complete later via webhook.
    return NextResponse.redirect(`${site}/dashboard/books/${order.book_id}?payment=processing`);
  } catch (e) {
    console.error("[paypal] capture failed", e);
    return NextResponse.redirect(`${site}/dashboard/books/${order.book_id}?payment=failed`);
  }
}
