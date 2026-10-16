import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { PUBLIC_PAGES, type PublicSlug } from "@/components/marketing/pages/registry";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";
import { previewCatalog } from "@/lib/preview-fixtures";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Gate } from "../../../gate";

export const metadata: Metadata = { title: "Preview · Site", robots: { index: false, follow: false } };

export function generateStaticParams() {
  return Object.keys(PUBLIC_PAGES).map((page) => ({ page }));
}

async function Page({ params, locale }: { params: Promise<{ page: string }>; locale: Locale }) {
  const { page } = await params;
  if (!(page in PUBLIC_PAGES)) notFound();
  const d = getDictionary(locale);
  return (
    <>
      <SiteNav d={d} locale={locale} />
      <main id="main">{PUBLIC_PAGES[page as PublicSlug].render({ d, locale, catalog: previewCatalog(locale), supportEmail: null })}</main>
      <SiteFooter d={d} locale={locale} />
    </>
  );
}

/** Public sub-pages with preview catalog data (no database needed). Internal only. */
export default async function SitePreview({ params }: PageProps<"/[locale]/design-system/preview/site/[page]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={null}><Gate><Page params={params} locale={l} /></Gate></Suspense>;
}
