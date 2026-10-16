import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import {
  Avatar, Badge, BlobFrame, Button, Card, Checkbox, FloatingDecor, Icon, IconButton, Progress, Radio, Scallop,
  SpeechBubble, Stepper, StoryCard, Switch, Tooltip, WaveDivider,
} from "@/components/storyling";
import { BookPage } from "@/components/book/BookPage";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { InteractiveDemos } from "./Interactive";
import { Gate } from "./gate";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

const SCALES: Array<[string, string[]]> = [
  ["ink", ["900", "800", "700", "500", "400", "300", "200", "100"]],
  ["paper", ["", "-2", "-3"]],
  ["blue", ["50", "100", "200", "400", "500", "600", "700", "800"]],
  ["sun", ["100", "200", "400", "500", "600", "700"]],
  ["cherry", ["100", "400", "500", "600"]],
  ["bubble", ["100", "400", "500", "600"]],
  ["mint", ["100", "400", "500", "600"]],
  ["tangerine", ["100", "400", "500", "600"]],
  ["grape", ["100", "400", "500", "600"]],
  ["night", ["950", "900", "800", "700"]],
];

function Section({ title, children, id }: { title: string; id: string; children: ReactNode }) {
  return (
    <section id={id} style={{ display: "grid", gap: 20 }}>
      <h2 style={{ font: "var(--type-h3)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default async function DesignSystemPage() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  const rtl = l === "ar";
  return (
    <Suspense fallback={null}>
      <Gate>
        <main id="main" style={{ background: "var(--paper)" }}>
          <header style={{ position: "relative", background: "var(--blue-50)", paddingTop: 48 }}>
            <FloatingDecor preset="sky" />
            <div className="sl-wrap" style={{ position: "relative", display: "grid", gap: 12, paddingBottom: 24 }}>
              <span className="sl-eyebrow">Internal · {rtl ? "عربي (RTL)" : "English (LTR)"}</span>
              <h1 className="sl-sticker-text" style={{ font: "700 var(--text-h1)/1 var(--font-display)", color: "var(--ink-900)" }}>{d.designSystem.title}</h1>
              <p style={{ font: "var(--type-body-lg)", maxWidth: 640 }}>{d.designSystem.sub}</p>
            </div>
            <WaveDivider color="var(--paper)" variant="cloud" height={60} />
          </header>

          <div className="sl-wrap" style={{ display: "grid", gap: 64, padding: "32px var(--gutter) 96px" }}>
            <Section id="colors" title="Colour tokens">
              <div style={{ display: "grid", gap: 14 }}>
                {SCALES.map(([name, steps]) => (
                  <div key={name} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <b style={{ width: 90, font: "700 14px var(--font-body)", color: "var(--ink-900)" }}>{name}</b>
                    {steps.map((s) => {
                      const v = name === "paper" ? `--paper${s}` : `--${name}-${s}`;
                      return (
                        <div key={v} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                          <span style={{ width: 64, height: 48, borderRadius: 14, background: `var(${v})`, boxShadow: "var(--shadow-xs)", border: "2px solid var(--ink-100)" }} />
                          <code dir="ltr" style={{ font: "600 11px var(--font-mono)", color: "var(--ink-500)" }}>{v}</code>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["success", "warning", "danger", "info", "brand-primary", "brand-accent", "focus-ring", "text-link"].map((t) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "var(--white)", boxShadow: "var(--shadow-xs)", font: "700 13px var(--font-body)" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: `var(--${t})` }} /><code dir="ltr">--{t}</code>
                  </span>
                ))}
              </div>
            </Section>

            <Section id="type" title="Typography">
              <div style={{ display: "grid", gap: 14 }}>
                <div className="sl-sticker-text" style={{ font: "700 var(--text-hero)/1 var(--font-display)", color: "var(--ink-900)" }}>{rtl ? "طفلك. حكايته." : "Your child. Their story."}</div>
                <div style={{ font: "var(--type-h1)" }}>{rtl ? "عنوان رئيسي" : "Heading one"} <span style={{ color: "var(--cherry-500)" }}>{rtl ? "ساحر" : "magical"}</span></div>
                <div style={{ font: "var(--type-h2)" }}>{rtl ? "عنوان ثانٍ" : "Heading two"}</div>
                <div style={{ font: "var(--type-h3)" }}>{rtl ? "عنوان ثالث" : "Heading three"}</div>
                <div style={{ font: "var(--type-h4)" }}>{rtl ? "عنوان رابع" : "Heading four"}</div>
                <p style={{ font: "var(--type-body-lg)" }}>{d.home.sub}</p>
                <p style={{ font: "var(--type-body)" }}>{d.home.transformSub}</p>
                <p style={{ font: "var(--type-small)" }}>{d.home.transformNote}</p>
                <p style={{ font: "var(--type-story)", color: "var(--ink-900)", maxWidth: "var(--reading-max)" }}>{d.home.samplePages[1].text}</p>
                <span className="sl-eyebrow">{d.home.eyebrow}</span>
                <p>Inline <span className="sl-hl">highlight</span> and a <a href="#type">link with a wavy hover</a>.</p>
              </div>
            </Section>

            <Section id="buttons" title="Buttons">
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <Button iconEnd="arrow-right">{d.home.cta}</Button>
                <Button variant="secondary" iconStart="play-circle">Watch how</Button>
                <Button variant="outline">Maybe later</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="cherry" iconStart="tag">Limited offer</Button>
                <Button variant="night" iconStart="moon-stars">Bedtime mode</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <Button size="sm">Small</Button><Button>Medium</Button><Button size="lg" iconStart="magic-wand">Large</Button>
                <IconButton icon="heart" label="Favourite" /><IconButton icon="share-network" label="Share" variant="secondary" />
                <IconButton icon="x" label="Close" variant="ghost" size="sm" />
                <Tooltip label="Add to favourites"><IconButton icon="star" label="Star" variant="primary" /></Tooltip>
              </div>
            </Section>

            <Section id="forms" title="Forms">
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Checkbox label="I'm this child's parent or guardian" defaultChecked />
                <Checkbox label="Unchecked" />
                <Radio name="o" label="Portrait" defaultChecked /><Radio name="o" label="Landscape" />
                <Switch label="Bedtime mode" icon="moon" defaultChecked />
              </div>
              <InteractiveDemos rtl={rtl} />
            </Section>

            <Section id="cards" title="Cards">
              <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", alignItems: "start" }}>
                <Card><b>Elevated</b><p>White card, soft navy shadow.</p></Card>
                <Card tone="sun" wobble interactive tilt={-1.5}><b>Wobble + interactive</b><p>Hover to lift.</p></Card>
                <Card variant="sticker" tone="sky"><b>Sticker</b><p>For imagery and tiles.</p></Card>
                <Card variant="outlined"><b>Outlined</b><p>The one featured item.</p></Card>
                <Card variant="flat" tone="mint"><b>Flat</b><p>In-card choices.</p></Card>
                <Card tone="night"><b>Night</b><p>Bedtime surfaces.</p></Card>
              </div>
              <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))" }}>
                <StoryCard title="Luna and the Lost Star" coverTone="night" coverIcon="moon-stars" ageRange="4–6" pages={d.common.pages(12)} badge={d.dashboard.new} tilt={-1} href="#cards" />
                <StoryCard title="Omar Builds a Rocket" coverTone="sky" coverIcon="rocket-launch" ageRange="5–8" pages={d.common.pages(8)} progress={60} tilt={1} href="#cards" />
                <StoryCard title="The Brave Little Cloud" coverTone="mint" coverIcon="cloud-sun" pages={d.common.pages(16)} badge={d.dashboard.finished} badgeTone="mint" href="#cards" />
              </div>
            </Section>

            <Section id="display" title="Badges, avatars, speech bubbles">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(["sun", "sky", "bubble", "mint", "cherry", "grape", "tangerine", "ink"] as const).map((t) => <Badge key={t} tone={t}>{t}</Badge>)}
                <Badge tone="mint" variant="soft" icon="check">Paid</Badge><Badge tone="cherry" icon="heart" size="sm">Most loved</Badge>
              </div>
              <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
                <Avatar name="Layla" tone="bubble" active /><Avatar name="Omar" tone="sky" /><Avatar name="Pip" tone="tangerine" icon="cat" /><Avatar name="ليلى" tone="grape" size={72} />
              </div>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
                <SpeechBubble tone="night" tail="bottom-start">{d.home.bubble}</SpeechBubble>
                <SpeechBubble tone="sun" tail="bottom-end">Tap a page to turn it!</SpeechBubble>
                <SpeechBubble tone="white" quote tail="none">Every great idea begins as a little spark of imagination.</SpeechBubble>
              </div>
            </Section>

            <Section id="feedback" title="Progress & steps">
              <Stepper current={2} steps={[{ label: "Child", icon: "baby" }, { label: "Character", icon: "user-circle" }, { label: "Theme", icon: "compass" }, "Settings", "Story"]} />
              <div style={{ display: "grid", gap: 14, maxWidth: 520 }}>
                <Progress value={65} label="Illustrating pages" showValue />
                <Progress value={30} tone="grape" size="sm" />
                <Progress value={100} tone="mint" striped={false} label="Done" />
              </div>
            </Section>

            <Section id="shapes" title="Shapes, edges & decoration">
              <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                {([1, 2, 3, 4] as const).map((s, i) => (
                  <BlobFrame key={s} shape={s} tone={(["sky", "sun", "bubble", "mint"] as const)[i]} label={`Blob ${s}`} icon={["image", "user", "book-open-text", "star"][i]} />
                ))}
              </div>
              {(["gentle", "playful", "cloud", "drip"] as const).map((v) => (
                <div key={v} style={{ background: "var(--blue-50)", borderRadius: 20, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", font: "700 13px var(--font-body)" }}>WaveDivider · {v}</div>
                  <WaveDivider variant={v} color="var(--blue-500)" height={56} />
                </div>
              ))}
              <div style={{ borderRadius: 20, overflow: "hidden", background: "var(--paper-2)" }}>
                <div style={{ background: "var(--sun-400)", padding: "18px 20px", font: "var(--type-h4)" }}>Scallop edge</div>
                <Scallop color="var(--sun-400)" size={24} />
                <div style={{ height: 30 }} />
              </div>
              <div style={{ position: "relative", height: 220, borderRadius: 28, background: "var(--night-900)", overflow: "hidden" }}>
                <FloatingDecor preset="night" />
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {["xs", "soft", "card", "float", "sticker"].map((s) => (
                  <div key={s} style={{ width: 120, height: 90, borderRadius: 24, background: "var(--white)", boxShadow: `var(--shadow-${s})`, display: "grid", placeItems: "center", font: "700 13px var(--font-body)" }}>shadow-{s}</div>
                ))}
              </div>
            </Section>

            <Section id="motion" title="Motion">
              <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "center", font: "700 13px var(--font-body)" }}>
                {["float", "twinkle", "wiggle", "drift", "pop-in"].map((a) => (
                  <div key={a} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
                    <span className={`sl-${a}`} style={{ display: "inline-block" }}><Icon name="star" size={40} color="var(--sun-400)" /></span>sl-{a}
                  </div>
                ))}
              </div>
              <p style={{ font: "var(--type-small)" }}>All animation is disabled under prefers-reduced-motion.</p>
            </Section>

            <Section id="book" title="Storybook page (shared reader + PDF)">
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ width: 240, aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                  <BookPage kind="story" orientation="portrait" language={l} ageRange="3-5" text={d.home.samplePages[0].text} textPosition="bottom" pageNumber={1} />
                </div>
                <div style={{ width: 360, aspectRatio: "3 / 2", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                  <BookPage kind="story" orientation="landscape" language={l} ageRange="3-5" text={d.home.samplePages[2].text} textPosition="start" pageNumber={2} />
                </div>
              </div>
            </Section>
          </div>
        </main>
      </Gate>
    </Suspense>
  );
}
