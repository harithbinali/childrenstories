import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { CharactersView } from "@/components/characters/CharactersView";
import { requireUser } from "@/lib/auth/guards";
import { listCharacters } from "@/lib/characters/queries";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).characters.title } : {};
}

async function Content({ locale }: { locale: Locale }) {
  await requireUser("/dashboard/characters");
  return <CharactersView d={getDictionary(locale)} items={await listCharacters()} />;
}

export default async function CharactersPage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} /></Suspense>;
}
