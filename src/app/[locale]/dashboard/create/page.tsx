import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { CreateWizard } from "@/components/creator/CreateWizard";
import { wizardLabels } from "@/components/creator/labels";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import { requireUser } from "@/lib/auth/guards";
import { getCreatorData } from "@/lib/books/queries";
import { getPublicCatalog } from "@/lib/catalog";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).creator.title } : {};
}

async function Content({ locale, searchParams }: { locale: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("/dashboard/create");
  const [data, catalog, sp] = await Promise.all([getCreatorData(), getPublicCatalog(locale), searchParams]);
  const d = getDictionary(locale);
  const pageCounts = [...new Set((catalog?.products ?? []).map((p) => p.pageCount))].sort((a, b) => a - b);
  return (
    <CreateWizard data={data} locale={locale} errors={d.errors} labels={wizardLabels(d, locale)}
      themes={(catalog?.themes ?? []).map((t) => ({ id: t.id, slug: t.slug, name: t.name, isCustom: t.isCustom }))}
      pageCounts={pageCounts.length ? pageCounts : [8, 12, 16]}
      initial={{ childId: typeof sp.child === "string" ? sp.child : undefined, characterId: typeof sp.character === "string" ? sp.character : undefined }} />
  );
}

export default async function CreatePage({ searchParams }: PageProps<"/[locale]/dashboard/create">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  return (
    <PageBody>
      <PageHeader title={d.creator.title} />
      <Suspense fallback={<p>{d.common.loading}</p>}><Content locale={l} searchParams={searchParams} /></Suspense>
    </PageBody>
  );
}
