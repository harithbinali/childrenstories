import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { formatMoney } from "@/lib/payments/pricing";
import type { EmailTemplate } from "@/lib/email/templates";
import { PermanentJobError, type JobHandler } from "../types";

export const sendEmail: JobHandler = async ({ job }) => {
  if (!job.owner_id) throw new PermanentJobError("email job without recipient");
  const template = job.payload.template as EmailTemplate;
  const db = createAdminClient();
  const data: Record<string, unknown> = {};

  if (job.payload.book_id) {
    const { data: book } = await db.from("books").select("id, title").eq("id", job.payload.book_id as string).single();
    data.bookId = book?.id;
    data.bookTitle = book?.title ?? "";
  }
  if (job.payload.order_id) {
    const { data: order } = await db.from("orders").select("order_number, total_amount, refunded_amount, currency").eq("id", job.payload.order_id as string).single();
    if (order) {
      data.orderNumber = order.order_number;
      const amount = template === "refund_confirmation" ? Number(job.payload.refund_amount ?? order.refunded_amount) : order.total_amount;
      data.amount = formatMoney(amount, order.currency);
    }
  }
  if (job.payload.ticket_id) {
    const { data: t } = await db.from("support_tickets").select("id, ticket_number").eq("id", job.payload.ticket_id as string).single();
    data.ticketId = t?.id;
    data.ticketNumber = t?.ticket_number;
  }
  // The job's idempotency key is the email's idempotency key.
  const { data: jobRow } = await db.from("generation_jobs").select("idempotency_key").eq("id", job.id).single();
  return sendTransactionalEmail({ template, userId: job.owner_id, idempotencyKey: jobRow?.idempotency_key ?? `job:${job.id}`, data });
};
