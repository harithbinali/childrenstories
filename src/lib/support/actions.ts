"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { fail, ok, run, type ActionResult } from "@/lib/actions/result";
import { TICKET_CATEGORIES } from "./queries";

const uuid = z.string().uuid();
const optionalId = z.string().optional().transform((v) => (v && uuid.safeParse(v).success ? v : null));

const TicketInput = z.object({
  subject: z.string().trim().min(3).max(140),
  category: z.enum(TICKET_CATEGORIES),
  body: z.string().trim().min(1).max(5000),
  book_id: optionalId,
  order_id: optionalId,
});

export async function createTicket(_: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    const input = TicketInput.safeParse({
      subject: form.get("subject"), category: form.get("category") ?? "general", body: form.get("body"),
      book_id: form.get("book_id") || undefined, order_id: form.get("order_id") || undefined,
    });
    if (!input.success) return fail("invalid_input");
    await enforceRateLimit(`ticket-create:${user.id}`, 5, 3600);
    const db = await createClient();
    const { book_id, order_id, body, ...ticket } = input.data;

    // Only the parent's own book/order may be attached (RLS returns nothing for others).
    const [book, order] = await Promise.all([
      book_id ? db.from("books").select("id").eq("id", book_id).maybeSingle() : null,
      order_id ? db.from("orders").select("id").eq("id", order_id).maybeSingle() : null,
    ]);
    if ((book_id && !book?.data) || (order_id && !order?.data)) return fail("not_found");

    const { data: t, error } = await db.from("support_tickets").insert({ ...ticket, owner_id: user.id, book_id, order_id }).select("id").single();
    if (error || !t) throw new Error(error?.message);
    const { error: msgError } = await db.from("support_messages").insert({ ticket_id: t.id, author_id: user.id, body });
    if (msgError) {
      await createAdminClient().from("support_tickets").delete().eq("id", t.id);
      throw new Error(msgError.message);
    }
    revalidatePath("/dashboard/support");
    return ok({ id: t.id });
  });
}

const Reply = z.string().trim().min(1).max(5000);

export async function replyToTicket(ticketId: string, _: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const body = Reply.safeParse(form.get("body"));
    if (!body.success || !uuid.safeParse(ticketId).success) return fail("invalid_input");
    await enforceRateLimit(`ticket-reply:${user.id}`, 30, 3600);
    const db = await createClient();
    const { data: t } = await db.from("support_tickets").select("id, status").eq("id", ticketId).eq("owner_id", user.id).maybeSingle();
    if (!t) return fail("not_found");
    if (t.status === "closed") return fail("ticket_closed");
    const { error } = await db.from("support_messages").insert({ ticket_id: ticketId, author_id: user.id, body: body.data });
    if (error) throw new Error(error.message);
    // A parent's reply puts the ticket back in the staff queue (reopening a resolved one).
    await createAdminClient().from("support_tickets").update({ status: "awaiting_staff", closed_at: null }).eq("id", ticketId).neq("status", "closed");
    revalidatePath(`/dashboard/support/${ticketId}`);
    return ok(undefined);
  });
}

export async function closeTicket(ticketId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    if (!uuid.safeParse(ticketId).success) return fail("invalid_input");
    const { data, error } = await createAdminClient()
      .from("support_tickets")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("owner_id", user.id)
      .neq("status", "closed")
      .select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) return fail("not_found");
    revalidatePath("/dashboard/support", "layout");
    return ok(undefined);
  });
}
