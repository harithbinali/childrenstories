import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/enqueue";
import type { GatewayId } from "./gateway";
import type { PaymentAction } from "./webhook-actions";

/** Applies a verified payment action. Safe to call repeatedly for the same event. */
export async function applyPaymentAction(gateway: GatewayId, action: PaymentAction): Promise<Record<string, unknown>> {
  const db = createAdminClient();
  switch (action.type) {
    case "ignore":
      return { ignored: action.reason };

    case "mark_paid": {
      const { data, error } = await db.rpc("mark_order_paid", {
        p_order_id: action.orderId, p_gateway: gateway, p_gateway_payment_id: action.gatewayPaymentId,
        p_amount: action.amount, p_currency: action.currency,
      });
      if (error) throw new Error(`mark_order_paid failed: ${error.message}`);
      const result = data as { already_paid?: boolean; error?: string };
      if (result.error) {
        console.error(`[payments] ${gateway} payment ${action.gatewayPaymentId} rejected: ${result.error}`);
        return result;
      }
      if (!result.already_paid) {
        const { data: order } = await db.from("orders").select("owner_id, book_id").eq("id", action.orderId).single();
        if (order?.owner_id) {
          await enqueueJob({
            type: "send_email", ownerId: order.owner_id, bookId: order.book_id,
            payload: { template: "payment_receipt", order_id: action.orderId, book_id: order.book_id },
            idempotencyKey: `email:receipt:${action.orderId}`,
          });
        }
      }
      return result;
    }

    case "mark_failed": {
      await db.from("orders").update({ status: action.status }).eq("id", action.orderId).in("status", ["pending", "processing"]);
      return { order_id: action.orderId, status: action.status };
    }

    case "record_refund": {
      let orderId = action.orderId;
      if (!orderId) {
        const { data: p } = await db.from("payments").select("order_id").eq("gateway", gateway).eq("gateway_payment_id", action.gatewayPaymentId).maybeSingle();
        orderId = p?.order_id ?? null;
      }
      if (!orderId) return { ignored: "refund for unknown payment" };
      const { data, error } = await db.rpc("record_refund", {
        p_order_id: orderId, p_gateway_refund_id: action.gatewayRefundId, p_amount: action.amount,
        p_currency: action.currency, p_status: action.status,
      });
      if (error) throw new Error(`record_refund failed: ${error.message}`);
      if (action.status === "succeeded") {
        const { data: order } = await db.from("orders").select("owner_id").eq("id", orderId).single();
        if (order?.owner_id) {
          await enqueueJob({
            type: "send_email", ownerId: order.owner_id,
            payload: { template: "refund_confirmation", order_id: orderId, refund_amount: action.amount },
            idempotencyKey: `email:refund:${action.gatewayRefundId}`,
          });
        }
      }
      return data as Record<string, unknown>;
    }
  }
}

/**
 * Records a webhook event once. Returns false when it was already processed
 * (duplicate delivery), so the caller can acknowledge without re-applying.
 */
export async function beginWebhookEvent(gateway: GatewayId, eventId: string, eventType: string, payload: unknown): Promise<boolean> {
  const db = createAdminClient();
  await db.from("payment_webhook_events").upsert({ gateway, event_id: eventId, event_type: eventType, payload }, { onConflict: "gateway,event_id", ignoreDuplicates: true });
  const { data } = await db.from("payment_webhook_events").select("processed_at").eq("gateway", gateway).eq("event_id", eventId).single();
  return !data?.processed_at;
}

export async function finishWebhookEvent(gateway: GatewayId, eventId: string, error?: string) {
  await createAdminClient()
    .from("payment_webhook_events")
    .update(error ? { processing_error: error.slice(0, 2000) } : { processed_at: new Date().toISOString(), processing_error: null })
    .eq("gateway", gateway)
    .eq("event_id", eventId);
}
