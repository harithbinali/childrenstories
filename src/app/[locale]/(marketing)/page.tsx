import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { HomeView } from "@/components/marketing/home/HomeView";
import { getPublicCatalog } from "@/lib/catalog";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomePage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const catalog = await getPublicCatalog(l);
  return <HomeView d={getDictionary(l)} locale={l} catalog={catalog} />;
}
