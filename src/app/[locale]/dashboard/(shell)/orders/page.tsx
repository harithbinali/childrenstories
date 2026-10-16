import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { OrdersView } from "@/components/account/OrdersView";
import { listOrders } from "@/lib/account/queries";
import { requireUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).orders.title } : {};
}

async function Content({ locale }: { locale: Locale }) {
  await requireUser("/dashboard/orders");
  return <OrdersView d={getDictionary(locale)} locale={locale} orders={await listOrders()} />;
}

export default async function OrdersPage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} /></Suspense>;
}
