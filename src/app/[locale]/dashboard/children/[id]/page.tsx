import { Suspense } from "react";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { ChildDetailView } from "@/components/children/ChildDetailView";
import { requireUser } from "@/lib/auth/guards";
import { getChild } from "@/lib/children/queries";
import { getPublicCatalog } from "@/lib/catalog";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

async function Content({ locale, params }: { locale: Locale; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/dashboard/children/${id}`);
  const [child, catalog] = await Promise.all([getChild(id), getPublicCatalog(locale)]);
  if (!child) notFound();
  return <ChildDetailView d={getDictionary(locale)} locale={locale} child={child} styles={catalog?.styles ?? []} />;
}

export default async function ChildPage({ params }: PageProps<"/[locale]/dashboard/children/[id]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return (
    <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}>
      <Content locale={l} params={params} />
    </Suspense>
  );
}
