import type { Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Faq, FinalCta, Gifts, Hero, HowItWorks, Pricing, Sample, Styles, TabletReading, Themes, Transformation } from "./HomeSections";

/** The homepage, as a pure view of (copy, catalog) — also used by the design preview route. */
export function HomeView({ d, locale, catalog }: { d: Dictionary; locale: Locale; catalog: Catalog | null }) {
  const p = { d, locale };
  return (
    <>
      <Hero {...p} />
      <HowItWorks {...p} />
      <Transformation {...p} />
      <Themes {...p} catalog={catalog} />
      <Styles {...p} catalog={catalog} />
      <Sample {...p} />
      <TabletReading {...p} />
      <Gifts {...p} />
      <Pricing {...p} catalog={catalog} />
      <Faq {...p} />
      <FinalCta {...p} />
    </>
  );
}
