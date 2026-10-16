import type { ReactNode } from "react";
import {
  Badge, BlobFrame, Button, Card, FloatingDecor, Icon, Scallop, SpeechBubble, WaveDivider,
} from "@/components/storyling";
import { BookPage } from "@/components/book/BookPage";
import type { Catalog } from "@/lib/catalog";
import { STYLE_ICONS, THEME_ICONS } from "@/lib/catalog";
import { formatMoney } from "@/lib/payments/pricing";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { SampleBook } from "./SampleBook";

type P = { d: Dictionary; locale: Locale };
const TINTS = ["sun", "sky", "bubble", "mint", "grape", "tangerine"] as const;
const INK = ["var(--sun-500)", "var(--blue-500)", "var(--bubble-500)", "var(--mint-500)", "var(--grape-500)", "var(--tangerine-500)"];

function SectionTitle({ children, sub, center = true, light }: { children: ReactNode; sub?: ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div style={{ textAlign: center ? "center" : "start", marginBottom: 48, display: "grid", gap: 10, justifyItems: center ? "center" : "start" }}>
      <h2 style={{ font: "var(--type-h1)", color: light ? "#fff" : undefined }}>{children}</h2>
      {sub && <p style={{ font: "var(--type-body-lg)", color: light ? "var(--blue-100)" : "var(--ink-700)", maxWidth: 620 }}>{sub}</p>}
    </div>
  );
}

export function Hero({ d }: P) {
  const h = d.home;
  return (
    <section style={{ position: "relative", background: "var(--blue-50)", paddingTop: 24 }}>
      <FloatingDecor preset="sky" />
      <div className="sl-wrap grid wide:grid-cols-[1.05fr_1fr] gap-12 wide:gap-10 items-center" style={{ position: "relative", paddingBottom: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" }}>
          <span className="sl-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", padding: "9px 14px", borderRadius: 999, boxShadow: "var(--shadow-xs)" }}>
            <Icon name="sparkle" color="var(--sun-500)" />{h.eyebrow}
          </span>
          <h1 className="sl-sticker-text" style={{ font: "700 var(--text-hero)/1 var(--font-display)", color: "var(--ink-900)" }}>
            {h.h1a}<br />{h.h1b}<br />
            <span style={{ color: "var(--cherry-500)", display: "inline-block", transform: "rotate(-2deg)", fontSize: "0.82em" }}>{h.h1c}</span>
          </h1>
          <p style={{ font: "var(--type-body-lg)", fontSize: 20, color: "var(--ink-700)", maxWidth: 540 }}>{h.sub}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
            <Button size="lg" iconStart="magic-wand" href="/register">{h.cta}</Button>
            <Button size="lg" variant="outline" iconStart="book-open" href="#sample">{h.cta2}</Button>
          </div>
        </div>
        <div style={{ position: "relative", minHeight: "clamp(380px, 46vw, 540px)" }}>
          <BlobFrame shape={1} tone="sun" icon="image" label="Hero illustration" aspect="1/1" style={{ position: "absolute", width: "78%", insetInlineEnd: 0, top: 0, transform: "rotate(3deg)" }} />
          <BlobFrame shape={3} tone="bubble" icon="book-open-text" label="Book cover" aspect="3/4" style={{ position: "absolute", width: "36%", insetInlineStart: 0, bottom: 10, transform: "rotate(-7deg)" }} />
          <SpeechBubble tone="night" tail="bottom-end" className="sl-float" style={{ position: "absolute", insetInlineStart: "2%", top: "4%", maxWidth: 260 }}>{h.bubble}</SpeechBubble>
          <span className="sl-float" style={{ position: "absolute", insetInlineEnd: "-2%", bottom: "8%", width: 84, height: 84, borderRadius: 26, background: "var(--mint-400)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sticker)", transform: "rotate(8deg)", ["--sl-rot" as string]: "8deg" }}>
            <Icon name="magic-wand" size={40} color="#fff" />
          </span>
        </div>
      </div>
      <WaveDivider color="var(--paper)" variant="cloud" height="clamp(50px, 6vw, 90px)" />
    </section>
  );
}

export function HowItWorks({ d, locale }: P) {
  return (
    <section id="how" style={{ padding: "var(--section-y) 0", scrollMarginTop: 80 }}>
      <div className="sl-wrap">
        <SectionTitle>{d.home.howTitle}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 36 }}>
          {d.home.steps.map((s, i) => (
            <Card key={s.title} tone={TINTS[i]} wobble interactive padding={30} tilt={[-2, 1.5, -1, 2][i]} className="wide:mt-[var(--stagger)]" style={{ ["--stagger" as string]: `${[0, 40, 10, 30][i]}px` }}>
              <span style={{ position: "absolute", top: -22, insetInlineEnd: 22, width: 52, height: 52, borderRadius: "50%", background: INK[i], color: i === 0 ? "var(--ink-900)" : "#fff", display: "grid", placeItems: "center", font: "700 24px/1 var(--font-display)", boxShadow: "var(--shadow-sticker)" }}>{num(i + 1, locale)}</span>
              <Icon name={s.icon} weight="duotone" size={54} color="var(--ink-900)" />
              <h3 style={{ font: "var(--type-h3)", margin: "14px 0 8px" }}>{s.title}</h3>
              <p style={{ color: "var(--ink-700)" }}>{s.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Transformation({ d }: P) {
  const h = d.home;
  return (
    <section style={{ padding: "0 0 var(--section-y)" }}>
      <div className="sl-wrap grid wide:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <div style={{ display: "grid", gap: 18 }}>
          <h2 style={{ font: "var(--type-h1)" }}>{h.transformTitle}</h2>
          <p style={{ font: "var(--type-body-lg)", color: "var(--ink-700)" }}>{h.transformSub}</p>
          <Card tone="mint" variant="flat" padding={18} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Icon name="shield-check" size={28} color="var(--mint-600)" />
            <p style={{ font: "var(--type-small)", color: "var(--ink-800)" }}>{h.transformNote}</p>
          </Card>
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
          <figure style={{ margin: 0, display: "grid", gap: 12, justifyItems: "center", transform: "rotate(-3deg)" }}>
            <BlobFrame shape={2} tone="sky" icon="camera" label={h.transformPhoto} aspect="3/4" style={{ width: "100%" }} />
            <figcaption className="sl-eyebrow">{h.transformPhoto}</figcaption>
          </figure>
          <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--sun-400)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sticker)" }}>
            <Icon name="magic-wand" size={30} color="var(--ink-900)" className="sl-wiggle" />
          </span>
          <figure style={{ margin: 0, display: "grid", gap: 12, justifyItems: "center", transform: "rotate(3deg)" }}>
            <BlobFrame shape={4} tone="bubble" icon="user-circle" label={h.transformCharacter} aspect="3/4" style={{ width: "100%" }} />
            <figcaption className="sl-eyebrow" style={{ color: "var(--bubble-600)" }}>{h.transformCharacter}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function Themes({ d, catalog }: P & { catalog: Catalog | null }) {
  if (!catalog?.themes.length) return null;
  const themes = [...catalog.themes].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 8);
  return (
    <section id="themes" style={{ scrollMarginTop: 80 }}>
      <WaveDivider color="var(--blue-500)" variant="playful" height={70} />
      <div style={{ background: "var(--blue-500)", padding: "40px 0 70px", position: "relative" }}>
        <div className="sl-wrap">
          <SectionTitle light sub={d.home.themesSub}>{d.home.themesTitle}</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(150px,40%),1fr))", gap: "clamp(14px, 2vw, 22px)" }}>
            {themes.map((t, i) => (
              <Card key={t.slug} tone="white" interactive padding="clamp(14px, 2vw, 22px)" tilt={[-1.5, 1, -0.5, 1.5][i % 4]} style={{ display: "grid", gap: 12 }}>
                <span style={{ width: "clamp(52px, 6vw, 64px)", height: "clamp(52px, 6vw, 64px)", borderRadius: 22, background: `var(--tint-${TINTS[i % 6]})`, display: "grid", placeItems: "center", transform: `rotate(${i % 2 ? 5 : -5}deg)`, boxShadow: "var(--shadow-sticker)" }}>
                  <Icon name={THEME_ICONS[t.slug] ?? "book-open-text"} weight="duotone" size={34} color="var(--ink-900)" />
                </span>
                <h3 style={{ font: "var(--type-h4)" }}>{t.name}</h3>
                {t.description && <p style={{ font: "var(--type-small)", color: "var(--ink-500)" }}>{t.description}</p>}
              </Card>
            ))}
          </div>
        </div>
      </div>
      <WaveDivider color="var(--blue-500)" variant="gentle" flip height={70} />
    </section>
  );
}

export function Styles({ d, catalog }: P & { catalog: Catalog | null }) {
  if (!catalog?.styles.length) return null;
  const tones = ["sun", "sky", "bubble", "grape"] as const;
  return (
    <section style={{ padding: "var(--section-y) 0" }}>
      <div className="sl-wrap">
        <SectionTitle sub={d.home.stylesSub}>{d.home.stylesTitle}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,40%),1fr))", gap: "clamp(18px, 3vw, 30px)" }}>
          {catalog.styles.map((s, i) => (
            <div key={s.slug} style={{ display: "grid", gap: 14, transform: `rotate(${[-1.5, 1, -1, 1.5][i % 4]}deg)` }}>
              <BlobFrame shape={((i % 4) + 1) as 1 | 2 | 3 | 4} tone={tones[i % 4]} icon={STYLE_ICONS[s.slug] ?? "palette"} label={s.name} aspect="4/5"
                src={s.previewPath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-assets/${s.previewPath}` : null} alt={s.name} />
              <h3 style={{ font: "var(--type-h4)", textAlign: "center" }}>{s.name}</h3>
              {s.description && <p style={{ font: "var(--type-small)", color: "var(--ink-500)", textAlign: "center" }}>{s.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Sample({ d, locale }: P) {
  const h = d.home;
  return (
    <section id="sample" style={{ padding: "0 0 var(--section-y)", scrollMarginTop: 80 }}>
      <div className="sl-wrap">
        <SectionTitle sub={h.sampleSub}>{h.sampleTitle}</SectionTitle>
        <SampleBook locale={locale} pages={h.samplePages} prevLabel={h.samplePrev} nextLabel={h.sampleNext} pageOfLabels={h.samplePages.map((_, i) => h.samplePageOf(i + 1, h.samplePages.length))} />
      </div>
    </section>
  );
}

export function TabletReading({ d, locale }: P) {
  const h = d.home;
  const art = (icon: string, tone: string) => (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 90% at 30% 20%, var(--${tone}-100), var(--${tone}-400))`, display: "grid", placeItems: "center" }}>
      <Icon name={icon} weight="duotone" size={64} color={`var(--${tone}-600)`} />
    </div>
  );
  return (
    <section style={{ position: "relative" }}>
      <WaveDivider color="var(--night-900)" variant="gentle" height={70} />
      <div style={{ background: "var(--night-900)", color: "var(--ink-200)", position: "relative", padding: "30px 0 70px" }}>
        {/* Decor stays on the device side and edges — never over the heading (Storyling rule). */}
        <FloatingDecor items={[
          { icon: "moon-stars", color: "var(--sun-400)", size: 52, top: "4%", end: "4%", anim: "float" },
          { icon: "star", color: "var(--sun-200)", size: 14, bottom: "10%", start: "3%", anim: "twinkle" },
          { icon: "sparkle", color: "var(--grape-400)", size: 22, bottom: "6%", end: "30%", anim: "twinkle", delay: 1.1 },
          { icon: "star-four", color: "var(--sun-200)", size: 14, top: "8%", end: "40%", anim: "twinkle", delay: 1.8 },
        ]} />
        <div className="sl-wrap grid wide:grid-cols-[1fr_1.3fr] gap-12 items-center" style={{ position: "relative" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <h2 style={{ font: "var(--type-h1)", color: "#fff" }}>{h.tabletTitle}</h2>
            <p style={{ font: "var(--type-body-lg)", color: "var(--ink-200)" }}>{h.tabletSub}</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
              {h.tabletPoints.map((pt) => (
                <li key={pt.text} style={{ display: "flex", gap: 12, alignItems: "center", font: "700 17px var(--font-body)", color: "#fff" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 14, background: "var(--night-700)", display: "grid", placeItems: "center" }}><Icon name={pt.icon} color="var(--sun-400)" size={22} /></span>
                  {pt.text}
                </li>
              ))}
            </ul>
          </div>
          {/* Tablet mock: a landscape device showing a two-page spread */}
          <div aria-hidden="true" style={{ background: "var(--ink-900)", borderRadius: 36, padding: "18px 22px", boxShadow: "0 40px 80px -30px rgba(0,0,0,.6), inset 0 0 0 3px var(--night-700)", transform: "rotate(-2deg)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: "var(--paper)", borderRadius: 14, padding: 10 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ aspectRatio: "2 / 3", borderRadius: 6, overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
                  <BookPage kind="story" orientation="portrait" language={locale} ageRange="3-5" text={h.samplePages[i].text} textPosition="bottom" pageNumber={i + 1}
                    art={art(h.samplePages[i].icon, ["grape", "blue"][i])} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <WaveDivider color="var(--night-900)" variant="playful" flip height={70} />
    </section>
  );
}

export function Gifts({ d }: P) {
  return (
    <section style={{ padding: "var(--section-y) 0" }}>
      <div className="sl-wrap">
        <SectionTitle center={false} sub={d.home.giftsSub}>{d.home.giftsTitle}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 32 }}>
          {d.home.gifts.map((g, i) => (
            <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ width: 72, height: 72, borderRadius: 24, background: `var(--tint-${g.tone})`, display: "grid", placeItems: "center", transform: `rotate(${i % 2 ? 5 : -5}deg)`, boxShadow: "var(--shadow-sticker)" }}>
                <Icon name={g.icon} weight="duotone" size={38} color="var(--ink-900)" />
              </span>
              <h3 style={{ font: "var(--type-h4)", marginTop: 8 }}>{g.title}</h3>
              <p style={{ color: "var(--ink-700)" }}>{g.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing({ d, locale, catalog }: P & { catalog: Catalog | null }) {
  const h = d.home;
  const products = catalog?.products ?? [];
  // "Best value" is computed (lowest price per story page), never a made-up popularity claim.
  const best = products.length > 1 ? products.reduce((a, b) => (b.priceAmount / b.pageCount < a.priceAmount / a.pageCount ? b : a)) : null;
  const heads = ["var(--tint-mint)", "var(--tint-sky)", "var(--tint-grape)"];
  return (
    <section id="pricing" style={{ padding: "0 0 var(--section-y)", scrollMarginTop: 80 }}>
      <div className="sl-wrap">
        <SectionTitle sub={h.pricingSub}>{h.pricingTitle}</SectionTitle>
        {products.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--ink-500)" }}>{h.pricingUnavailable}</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 28, alignItems: "start" }}>
              {products.map((p, i) => {
                const hot = p.id === best?.id;
                const head = hot ? "var(--sun-400)" : heads[i % 3];
                return (
                  <Card key={p.id} variant={hot ? "outlined" : "elevated"} padding={0} className={hot ? "wide:-translate-y-3.5" : ""} style={{ overflow: "visible" }}>
                    <div style={{ background: head, borderRadius: "28px 28px 0 0", padding: "26px 28px 14px", position: "relative" }}>
                      {hot && <Badge tone="cherry" icon="star" style={{ position: "absolute", top: -14, insetInlineEnd: 20 }}>{h.pricingBestValue}</Badge>}
                      <div style={{ font: "var(--type-h4)", color: "var(--ink-900)" }}>{num(p.pageCount, locale)} {h.pricingStoryPages}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ font: "700 48px/1 var(--font-display)", color: "var(--ink-900)" }}>{formatMoney(p.priceAmount, p.currency, locale)}</span>
                        <span style={{ font: "var(--type-small)", color: "var(--ink-700)" }}>{h.pricingPerPage(formatMoney(Math.round(p.priceAmount / p.pageCount), p.currency, locale))}</span>
                      </div>
                    </div>
                    <Scallop color={head} size={24} />
                    <div style={{ padding: "18px 28px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {h.pricingIncludes.map((it) => (
                        <div key={it} style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600, color: "var(--ink-800)" }}><Icon name="check-circle" color="var(--mint-500)" size={22} />{it}</div>
                      ))}
                      <Button block variant={hot ? "primary" : "outline"} href={`/register?pages=${p.pageCount}`} style={{ marginTop: 12 }}>{h.pricingCta}</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
            <p style={{ textAlign: "center", marginTop: 26, font: "var(--type-small)", color: "var(--ink-500)" }}>{h.pricingExtras}</p>
          </>
        )}
      </div>
    </section>
  );
}

export function Faq({ d }: P) {
  return (
    <section id="faq" style={{ padding: "0 0 var(--section-y)", scrollMarginTop: 80 }}>
      <div className="sl-wrap" style={{ maxWidth: 860 }}>
        <SectionTitle>{d.home.faqTitle}</SectionTitle>
        <div style={{ display: "grid", gap: 16 }}>
          {d.home.faqs.map((f, i) => (
            <details key={f.q} className="sl-card sl-faq" style={{ ["--_pad" as string]: "0px", background: i % 2 ? "var(--white)" : "var(--tint-sky)" }}>
              <summary style={{ listStyle: "none", cursor: "pointer", padding: "20px 24px", display: "flex", gap: 14, alignItems: "center", font: "var(--type-h4)", color: "var(--ink-900)" }}>
                <Icon name="question" color="var(--blue-500)" size={26} />
                <span style={{ flex: 1 }}>{f.q}</span>
                <Icon name="caret-down" weight="bold" className="sl-faq__caret" />
              </summary>
              <p style={{ padding: "0 24px 22px", paddingInlineStart: 64, color: "var(--ink-700)" }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ d }: P) {
  return (
    <section style={{ padding: "0 0 var(--section-y)" }}>
      <div className="sl-wrap">
        <Card tone="sun" wobble padding="clamp(28px, 5vw, 56px)" style={{ overflow: "hidden", display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
          <FloatingDecor preset="magic" />
          <h2 style={{ font: "var(--type-h1)", position: "relative", maxWidth: 720 }}>{d.home.finalTitle}</h2>
          <p style={{ font: "var(--type-body-lg)", position: "relative", color: "var(--ink-800)", maxWidth: 520 }}>{d.home.finalSub}</p>
          <div style={{ position: "relative", marginTop: 8 }}><Button variant="secondary" size="lg" iconStart="magic-wand" href="/register">{d.home.finalCta}</Button></div>
        </Card>
      </div>
    </section>
  );
}
