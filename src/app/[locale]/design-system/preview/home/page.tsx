import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { HomeView } from "@/components/marketing/home/HomeView";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";
import { previewCatalog } from "@/lib/preview-fixtures";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Gate } from "../../gate";

export const metadata: Metadata = { title: "Preview · Home", robots: { index: false, follow: false } };

/** Homepage with preview catalog data (no database needed). Internal only. */
export default async function HomePreview() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  return (
    <Suspense fallback={null}>
      <Gate>
        <SiteNav d={d} locale={l} />
        <main id="main"><HomeView d={d} locale={l} catalog={previewCatalog(l)} /></main>
        <SiteFooter d={d} locale={l} />
      </Gate>
    </Suspense>
  );
}
