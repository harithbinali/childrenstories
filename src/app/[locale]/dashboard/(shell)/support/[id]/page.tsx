import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { TicketView } from "@/components/support/SupportViews";
import { ReplyForm } from "@/components/support/SupportForms";
import { getTicket } from "@/lib/support/queries";
import { requireUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).support.title } : {};
}

async function Content({ locale, params }: { locale: Locale; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/support/${id}`);
  const ticket = /^[0-9a-f-]{36}$/i.test(id) ? await getTicket(id, user.id) : null;
  if (!ticket) notFound();
  const d = getDictionary(locale);
  return <TicketView d={d} locale={locale} ticket={ticket} userName={user.displayName ?? user.email ?? ""}
    replyForm={<ReplyForm ticketId={ticket.id} errors={d.errors} labels={{ reply: d.support.reply, replyPlaceholder: d.support.replyPlaceholder, sending: d.support.sending }} />} />;
}

export default async function TicketPage({ params }: PageProps<"/[locale]/dashboard/support/[id]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} params={params} /></Suspense>;
}
