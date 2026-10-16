import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function MarketingLayout({ children }: LayoutProps<"/[locale]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  return (
    <>
      <SiteNav d={d} locale={l} />
      <main id="main">{children}</main>
      <SiteFooter d={d} locale={l} />
    </>
  );
}
