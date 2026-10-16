import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { NewTicketView } from "@/components/support/SupportViews";
import { getTicketContext } from "@/lib/support/queries";
import { requireUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).support.newTitle } : {};
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Content({ locale, searchParams }: { locale: Locale; searchParams: SP }) {
  await requireUser("/dashboard/support/new");
  const [ctx, sp] = await Promise.all([getTicketContext(), searchParams]);
  return <NewTicketView d={getDictionary(locale)} locale={locale} books={ctx.books} orders={ctx.orders}
    initial={{ category: str(sp.category), bookId: str(sp.book), orderId: str(sp.order) }} />;
}

export default async function NewTicketPage({ searchParams }: PageProps<"/[locale]/dashboard/support/new">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} searchParams={searchParams} /></Suspense>;
}
