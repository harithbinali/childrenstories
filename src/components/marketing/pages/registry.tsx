import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { legalAr } from "@/content/legal/ar";
import { legalEn } from "@/content/legal/en";
import type { LegalSlug } from "@/content/legal/types";
import { getPublicCatalog, type Catalog } from "@/lib/catalog";
import { getPublicSettings } from "@/lib/public-settings";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { LegalView } from "./LegalView";
import { AboutPage, ContactPage, ExamplesPage, FaqPage, HowItWorksPage, PricingPage, StylesPage, ThemesPage } from "./PublicPages";

type Ctx = { d: Dictionary; locale: Locale; catalog: Catalog | null; supportEmail: string | null };
type Entry = { title: (d: Dictionary, l: Locale) => string; description: (d: Dictionary, l: Locale) => string; render: (c: Ctx) => ReactNode; catalog?: boolean };

export const legalDocs = (l: Locale) => (l === "ar" ? legalAr : legalEn);

const legal = (slug: LegalSlug): Entry => ({
  title: (_, l) => legalDocs(l)[slug].title,
  description: (_, l) => legalDocs(l)[slug].summary,
  render: ({ d, locale }) => <LegalView d={d} slug={slug} doc={legalDocs(locale)[slug]} docs={legalDocs(locale)} />,
});

/** Every public sub-page, keyed by its URL path segment. */
export const PUBLIC_PAGES = {
  "how-it-works": { title: (d) => d.pages.howItWorks.title, description: (d) => d.pages.howItWorks.sub, render: (c) => <HowItWorksPage {...c} /> },
  themes: { title: (d) => d.pages.themes.title, description: (d) => d.pages.themes.sub, render: (c) => <ThemesPage {...c} />, catalog: true },
  styles: { title: (d) => d.pages.styles.title, description: (d) => d.pages.styles.sub, render: (c) => <StylesPage {...c} />, catalog: true },
  examples: { title: (d) => d.pages.examples.title, description: (d) => d.pages.examples.sub, render: (c) => <ExamplesPage {...c} /> },
  pricing: { title: (d) => d.pages.pricing.title, description: (d) => d.pages.pricing.sub, render: (c) => <PricingPage {...c} />, catalog: true },
  faq: { title: (d) => d.pages.faq.title, description: (d) => d.pages.faq.sub, render: (c) => <FaqPage {...c} /> },
  about: { title: (d) => d.pages.about.title, description: (d) => d.pages.about.sub, render: (c) => <AboutPage {...c} /> },
  contact: { title: (d) => d.pages.contact.title, description: (d) => d.pages.contact.sub, render: (c) => <ContactPage {...c} /> },
  privacy: legal("privacy"),
  terms: legal("terms"),
  "refund-policy": legal("refunds"),
  "child-photo-privacy": legal("photoPrivacy"),
} satisfies Record<string, Entry>;

export type PublicSlug = keyof typeof PUBLIC_PAGES;

export function publicMetadata(slug: PublicSlug) {
  return async (): Promise<Metadata> => {
    const l = await localeParam();
    if (!isLocale(l)) return {};
    const d = getDictionary(l);
    const p: Entry = PUBLIC_PAGES[slug];
    return { title: p.title(d, l), description: p.description(d, l), alternates: { languages: { en: `/en/${slug}`, ar: `/ar/${slug}` } } };
  };
}

/** Server component for a public page: loads only the data that page needs (both cached). */
export function publicPage(slug: PublicSlug) {
  return async function PublicPage() {
    const l = await localeParam();
    if (!isLocale(l)) notFound();
    const p: Entry = PUBLIC_PAGES[slug];
    const [catalog, settings] = await Promise.all([p.catalog ? getPublicCatalog(l) : null, slug === "contact" ? getPublicSettings() : null]);
    return p.render({ d: getDictionary(l), locale: l, catalog, supportEmail: settings?.supportEmail ?? null });
  };
}
