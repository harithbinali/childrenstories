import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { ChildrenView } from "@/components/children/ChildrenView";
import { requireUser } from "@/lib/auth/guards";
import { listChildren } from "@/lib/children/queries";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).children.title } : {};
}

async function Content({ locale, searchParams }: { locale: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("/dashboard/children");
  const [kids, sp] = await Promise.all([listChildren(), searchParams]);
  return <ChildrenView d={getDictionary(locale)} locale={locale} kids={kids} showForm={sp.new === "1"} />;
}

export default async function ChildrenPage({ searchParams }: PageProps<"/[locale]/dashboard/children">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return (
    <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}>
      <Content locale={l} searchParams={searchParams} />
    </Suspense>
  );
}
