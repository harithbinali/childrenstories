import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { AppShell } from "@/components/dashboard/AppShell";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { MOBILE_PRIMARY, dashboardNav } from "@/components/dashboard/nav";
import { Wordmark } from "@/components/marketing/Wordmark";
import { ChildrenView } from "@/components/children/ChildrenView";
import { ChildDetailView } from "@/components/children/ChildDetailView";
import { CharacterStudioView } from "@/components/characters/CharacterStudioView";
import { CharactersView } from "@/components/characters/CharactersView";
import { previewCatalog, previewCharacter, previewChildDetail, previewChildren } from "@/lib/preview-fixtures";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { Gate } from "../../gate";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Dashboard screens rendered with preview data, for design review. Internal only. */
const SCREENS: Record<string, (d: Dictionary, l: Locale) => ReactNode> = {
  children: (d, l) => <ChildrenView d={d} locale={l} kids={previewChildren(l)} showForm />,
  child: (d, l) => <ChildDetailView d={d} locale={l} child={previewChildDetail(l)} styles={previewCatalog(l).styles} />,
  characters: (d, l) => <CharactersView d={d} items={previewChildren(l).map((k, i) => ({ id: `c${i}`, name: k.name, status: i ? "ready" : "approved", childName: k.name, imageUrl: null }))} />,
  "character-generating": (d, l) => <CharacterStudioView d={d} c={previewCharacter(l, "generating")} styles={previewCatalog(l).styles} />,
  "character-ready": (d, l) => <CharacterStudioView d={d} c={previewCharacter(l, "ready")} styles={previewCatalog(l).styles} />,
  "character-approved": (d, l) => <CharacterStudioView d={d} c={previewCharacter(l, "approved")} styles={previewCatalog(l).styles} />,
};

export function generateStaticParams() {
  return Object.keys(SCREENS).map((screen) => ({ screen }));
}

async function Screen({ params, locale }: { params: Promise<{ screen: string }>; locale: Locale }) {
  const { screen } = await params;
  const render = SCREENS[screen];
  if (!render) notFound();
  const d = getDictionary(locale);
  return (
    <AppShell brand={<Wordmark name={d.brand} />} nav={dashboardNav(d, false)} mobilePrimary={MOBILE_PRIMARY} moreLabel={d.dashboard.more}
      sidebarFooter={<AccountCard d={d} locale={locale} name="Hana" email="hana@example.com" />}>
      {render(d, locale)}
    </AppShell>
  );
}

export default async function PreviewScreen({ params }: PageProps<"/[locale]/design-system/preview/[screen]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return (
    <Suspense fallback={null}>
      <Gate><Screen params={params} locale={l} /></Gate>
    </Suspense>
  );
}
