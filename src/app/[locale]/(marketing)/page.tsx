import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { HomeView } from "@/components/marketing/home/HomeView";
import { getPublicCatalog } from "@/lib/catalog";
import { applyMarketingContent, getMarketingContent } from "@/lib/marketing-content";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomePage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const [catalog, content] = await Promise.all([getPublicCatalog(l), getMarketingContent(l)]);
  return <HomeView d={applyMarketingContent(getDictionary(l), content)} locale={l} catalog={catalog} />;
}
