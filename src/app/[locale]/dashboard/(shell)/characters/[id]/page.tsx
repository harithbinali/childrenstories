import { Suspense } from "react";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { CharacterStudioView } from "@/components/characters/CharacterStudioView";
import { requireUser } from "@/lib/auth/guards";
import { getCharacter } from "@/lib/characters/queries";
import { getPublicCatalog } from "@/lib/catalog";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

async function Content({ locale, params }: { locale: Locale; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/dashboard/characters/${id}`);
  const [c, catalog] = await Promise.all([getCharacter(id, locale), getPublicCatalog(locale)]);
  if (!c) notFound();
  return <CharacterStudioView d={getDictionary(locale)} c={c} styles={catalog?.styles ?? []} />;
}

export default async function CharacterPage({ params }: PageProps<"/[locale]/dashboard/characters/[id]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} params={params} /></Suspense>;
}
