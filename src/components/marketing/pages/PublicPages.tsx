import { Button, Card, Icon } from "@/components/storyling";
import { Faq, FinalCta, HowItWorks, Pricing, Sample, SectionTitle, Styles, TabletReading, Themes, Transformation } from "@/components/marketing/home/HomeSections";
import type { Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Band, CheckList, CtaCard, InfoCards, PageHero } from "./PageParts";

type P = { d: Dictionary; locale: Locale };
type C = P & { catalog: Catalog | null };

/** Shown where catalog-driven content would be when the catalog can't be loaded. */
function Unavailable({ d }: { d: Dictionary }) {
  return <p style={{ textAlign: "center", color: "var(--ink-500)", padding: "40px 0" }}>{d.home.pricingUnavailable}</p>;
}

export function HowItWorksPage({ d, locale }: P) {
  const t = d.pages.howItWorks;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="magic-wand" />
      <HowItWorks d={d} locale={locale} />
      <Transformation d={d} locale={locale} />
      <Band>
        <SectionTitle sub={t.safetySub}>{t.safetyTitle}</SectionTitle>
        <InfoCards items={t.safety} />
      </Band>
      <TabletReading d={d} locale={locale} />
      <div style={{ height: "var(--section-y)" }} />
      <FinalCta d={d} locale={locale} />
    </>
  );
}

export function ThemesPage({ d, locale, catalog }: C) {
  const t = d.pages.themes;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="compass" />
      {catalog?.themes.length ? <Themes d={d} locale={locale} catalog={catalog} limit={100} title={false} /> : <Unavailable d={d} />}
      <Band><CtaCard title={t.customTitle} body={t.customBody} cta={t.customCta} href="/register" icon="lightbulb" /></Band>
      <FinalCta d={d} locale={locale} />
    </>
  );
}

export function StylesPage({ d, locale, catalog }: C) {
  const t = d.pages.styles;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="palette" />
      {catalog?.styles.length ? <Styles d={d} locale={locale} catalog={catalog} title={false} /> : <Unavailable d={d} />}
      <FinalCta d={d} locale={locale} />
    </>
  );
}

export function ExamplesPage({ d, locale }: P) {
  const t = d.pages.examples;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="book-open-text" />
      <div style={{ height: "clamp(16px,3vw,32px)" }} />
      <Sample d={d} locale={locale} title={false} />
      <p className="sl-wrap" style={{ textAlign: "center", marginTop: "calc(var(--section-y) * -0.6)", marginBottom: 40, font: "var(--type-small)", color: "var(--ink-500)" }}>{t.note}</p>
      <TabletReading d={d} locale={locale} />
      <div style={{ height: "var(--section-y)" }} />
      <FinalCta d={d} locale={locale} />
    </>
  );
}

export function PricingPage({ d, locale, catalog }: C) {
  const t = d.pages.pricing;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="tag" />
      <div style={{ height: "clamp(24px,4vw,48px)" }} />
      <Pricing d={d} locale={locale} catalog={catalog} title={false} />
      <Band>
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))" }}>
          <Card tone="mint" padding={28} style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <h2 style={{ font: "var(--type-h3)", display: "flex", gap: 10, alignItems: "center" }}><Icon name="gift" weight="duotone" />{t.freeTitle}</h2>
            <CheckList items={t.free} />
          </Card>
          <Card tone="sun" padding={28} style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <h2 style={{ font: "var(--type-h3)", display: "flex", gap: 10, alignItems: "center" }}><Icon name="book-open" weight="duotone" />{t.paidTitle}</h2>
            <CheckList items={t.paid} tone="mint" />
          </Card>
        </div>
      </Band>
      <Faq d={d} locale={locale} items={[d.home.faqs[5], d.pages.faq.more[2], d.pages.faq.more[3]].filter(Boolean)} />
      <FinalCta d={d} locale={locale} />
    </>
  );
}

export function FaqPage({ d, locale }: P) {
  const t = d.pages.faq;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="question" />
      <div style={{ height: "clamp(24px,4vw,48px)" }} />
      <Faq d={d} locale={locale} items={[...d.home.faqs, ...t.more]} title={false} />
      <Band narrow><CtaCard title={t.stillTitle} body={t.stillBody} cta={t.contactCta} href="/contact" icon="chat-circle-text" /></Band>
    </>
  );
}

export function AboutPage({ d, locale }: P) {
  const t = d.pages.about;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="heart" />
      <Band narrow>
        <div style={{ display: "grid", gap: 16 }}>
          <h2 style={{ font: "var(--type-h2)" }}>{t.storyTitle}</h2>
          {t.story.map((p) => <p key={p} style={{ font: "var(--type-body-lg)", color: "var(--ink-700)" }}>{p}</p>)}
        </div>
      </Band>
      <Band>
        <SectionTitle>{t.valuesTitle}</SectionTitle>
        <InfoCards items={t.values} min={220} />
      </Band>
      <FinalCta d={d} locale={locale} />
    </>
  );
}

export function ContactPage({ d, supportEmail }: P & { supportEmail: string | null }) {
  const t = d.pages.contact;
  return (
    <>
      <PageHero title={t.title} sub={t.sub} icon="chat-circle-text" />
      <Band>
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", alignItems: "start" }}>
          <Card tone="sky" wobble padding={28} style={{ display: "grid", gap: 14, justifyItems: "start" }}>
            <Icon name="lifebuoy" weight="duotone" size={44} color="var(--ink-900)" />
            <h2 style={{ font: "var(--type-h3)" }}>{t.parentsTitle}</h2>
            <p style={{ color: "var(--ink-700)" }}>{t.parentsBody}</p>
            <Button iconStart="lifebuoy" href="/dashboard/support/new">{t.parentsCta}</Button>
          </Card>
          <Card padding={28} style={{ display: "grid", gap: 14, justifyItems: "start" }}>
            <Icon name="envelope-simple" weight="duotone" size={44} color="var(--ink-900)" />
            <h2 style={{ font: "var(--type-h3)" }}>{t.emailTitle}</h2>
            <p style={{ color: "var(--ink-700)" }}>{t.emailBody}</p>
            {supportEmail
              ? <a href={`mailto:${supportEmail}`} dir="ltr" style={{ font: "700 18px var(--font-body)", overflowWrap: "anywhere" }}>{supportEmail}</a>
              : <mark dir="ltr" style={{ background: "var(--sun-200)", borderRadius: 6, padding: "0 6px", fontWeight: 700 }}>[SUPPORT EMAIL]</mark>}
          </Card>
          <Card tone="mint" padding={28} style={{ display: "grid", gap: 14, justifyItems: "start" }}>
            <Icon name="shield-check" weight="duotone" size={44} color="var(--ink-900)" />
            <h2 style={{ font: "var(--type-h3)" }}>{t.privacyTitle}</h2>
            <p style={{ color: "var(--ink-700)" }}>{t.privacyBody}</p>
          </Card>
        </div>
        <p style={{ font: "var(--type-small)", color: "var(--ink-500)", textAlign: "center" }}>
          {t.addressTitle}: <mark dir="ltr" style={{ background: "var(--sun-200)", borderRadius: 6, padding: "0 6px", fontWeight: 700 }}>{t.address}</mark>
        </p>
      </Band>
    </>
  );
}
