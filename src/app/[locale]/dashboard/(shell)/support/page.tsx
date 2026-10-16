import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { SupportListView } from "@/components/support/SupportViews";
import { listTickets } from "@/lib/support/queries";
import { requireUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).support.title } : {};
}

async function Content({ locale }: { locale: Locale }) {
  await requireUser("/dashboard/support");
  return <SupportListView d={getDictionary(locale)} locale={locale} tickets={await listTickets()} />;
}

export default async function SupportPage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} /></Suspense>;
}
