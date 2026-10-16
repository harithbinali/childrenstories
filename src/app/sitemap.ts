import type { MetadataRoute } from "next";
import { PUBLIC_PAGES } from "@/components/marketing/pages/registry";
import { LOCALES } from "@/i18n/config";

/** Public marketing pages only — private books and dashboards are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return ["", ...Object.keys(PUBLIC_PAGES).map((p) => `/${p}`)].map((path) => ({
    url: `${base}/en${path}`,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${path}`])) },
  }));
}
