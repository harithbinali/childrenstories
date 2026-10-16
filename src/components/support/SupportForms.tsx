"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { createTicket, replyToTicket } from "@/lib/support/actions";
import type { ActionResult } from "@/lib/actions/result";

type Errors = Record<string, string>;

export type NewTicketLabels = {
  subject: string; subjectPlaceholder: string; category: string; book: string; order: string; none: string;
  message: string; messagePlaceholder: string; messageHint: string; send: string; sending: string;
};

export function NewTicketForm({ labels, errors, categories, books, orders, initial }: {
  labels: NewTicketLabels; errors: Errors; categories: Array<{ value: string; label: string }>;
  books: Array<{ value: string; label: string }>; orders: Array<{ value: string; label: string }>;
  initial: { category?: string; bookId?: string; orderId?: string };
}) {
  const router = useRouter();
  const [state, submit, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(createTicket, null);
  useEffect(() => { if (state?.ok) router.push(`/dashboard/support/${state.data.id}`); }, [state, router]);
  const none = { value: "", label: labels.none };
  return (
    <form action={submit} style={{ display: "grid", gap: 18 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <Input name="subject" label={labels.subject} placeholder={labels.subjectPlaceholder} iconStart="chat-circle-text" required minLength={3} maxLength={140} />
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))" }}>
        <Select name="category" label={labels.category} iconStart="tag" options={categories} defaultValue={initial.category ?? "general"} />
        {books.length > 0 && <Select name="book_id" label={labels.book} iconStart="book-open" options={[none, ...books]} defaultValue={initial.bookId ?? ""} />}
        {orders.length > 0 && <Select name="order_id" label={labels.order} iconStart="receipt" options={[none, ...orders]} defaultValue={initial.orderId ?? ""} />}
      </div>
      <Input name="body" multiline label={labels.message} placeholder={labels.messagePlaceholder} hint={labels.messageHint} required maxLength={5000} />
      <div><Button type="submit" iconStart="paper-plane-tilt" disabled={pending}>{pending ? labels.sending : labels.send}</Button></div>
    </form>
  );
}

export function ReplyForm({ ticketId, labels, errors }: { ticketId: string; labels: { reply: string; replyPlaceholder: string; sending: string }; errors: Errors }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [state, submit, pending] = useActionState<ActionResult<undefined> | null, FormData>(replyToTicket.bind(null, ticketId), null);
  useEffect(() => { if (state?.ok) { form.current?.reset(); router.refresh(); } }, [state, router]);
  return (
    <form ref={form} action={submit} style={{ display: "grid", gap: 14 }}>
      <FormError message={state && !state.ok ? errors[state.error] ?? errors.unknown : null} />
      <Input name="body" multiline label={labels.reply} placeholder={labels.replyPlaceholder} required maxLength={5000} />
      <div><Button type="submit" iconStart="paper-plane-tilt" disabled={pending}>{pending ? labels.sending : labels.reply}</Button></div>
    </form>
  );
}
