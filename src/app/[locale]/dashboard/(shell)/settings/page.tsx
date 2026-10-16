import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { SettingsView } from "@/components/account/SettingsView";
import { getAccountSettings } from "@/lib/account/queries";
import { requireUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).settings.title } : {};
}

async function Content({ locale }: { locale: Locale }) {
  const user = await requireUser("/dashboard/settings");
  return <SettingsView d={getDictionary(locale)} locale={locale} s={await getAccountSettings(user.id)} />;
}

export default async function SettingsPage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} /></Suspense>;
}
