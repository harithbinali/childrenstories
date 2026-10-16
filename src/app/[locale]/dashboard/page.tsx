import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { requireUser } from "@/lib/auth/guards";
import { loadOverview } from "@/lib/dashboard/overview";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).dashboard.nav.overview } : {};
}

async function Overview({ locale }: { locale: Locale }) {
  const user = await requireUser("/dashboard");
  const data = await loadOverview(user);
  return <DashboardHome d={getDictionary(locale)} locale={locale} data={data} />;
}

export default async function DashboardPage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return (
    <Suspense fallback={<p style={{ padding: 44, color: "var(--ink-500)" }}>{getDictionary(l).common.loading}</p>}>
      <Overview locale={l} />
    </Suspense>
  );
}
