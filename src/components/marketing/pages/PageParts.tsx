import type { ReactNode } from "react";
import { Button, Card, FloatingDecor, Icon, WaveDivider } from "@/components/storyling";

/** Top of every public sub-page: title + intro on the sky band, decor kept to the edges. */
export function PageHero({ title, sub, icon, children }: { title: ReactNode; sub?: ReactNode; icon?: string; children?: ReactNode }) {
  return (
    <section style={{ position: "relative", background: "var(--blue-50)" }}>
      {/* Corners only: the centred title and intro can span the full width on phones. */}
      <FloatingDecor items={[
        { icon: "star", color: "var(--sun-500)", size: 22, top: "5%", end: "4%", anim: "twinkle", rotate: -12 },
        { icon: "sparkle", color: "var(--bubble-500)", size: 18, top: "7%", start: "5%", anim: "twinkle", delay: 0.5 },
        { icon: "paper-plane-tilt", color: "var(--grape-400)", size: 26, bottom: "3%", end: "5%", anim: "float", rotate: 8 },
        { icon: "heart", color: "var(--cherry-400)", size: 16, bottom: "4%", start: "6%", anim: "float", rotate: -14 },
      ]} />
      <div className="sl-wrap" style={{ position: "relative", padding: "clamp(40px,7vw,80px) 0 clamp(20px,3vw,32px)", display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
        {icon && (
          <span aria-hidden style={{ width: 72, height: 72, borderRadius: 24, background: "var(--sun-400)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sticker)", transform: "rotate(-6deg)" }}>
            <Icon name={icon} weight="duotone" size={38} color="var(--ink-900)" />
          </span>
        )}
        <h1 className="sl-sticker-text" style={{ font: "700 clamp(38px, 6vw, 64px)/1.05 var(--font-display)", color: "var(--ink-900)", maxWidth: 820 }}>{title}</h1>
        {sub && <p style={{ font: "var(--type-body-lg)", color: "var(--ink-700)", maxWidth: 620 }}>{sub}</p>}
        {children}
      </div>
      <WaveDivider color="var(--paper)" variant="cloud" height="clamp(40px, 5vw, 70px)" />
    </section>
  );
}

const TINTS = ["sky", "bubble", "mint", "sun", "grape", "tangerine"] as const;

export function InfoCards({ items, min = 240 }: { items: ReadonlyArray<{ icon: string; title: string; body: string }>; min?: number }) {
  return (
    <div style={{ display: "grid", gap: 24, gridTemplateColumns: `repeat(auto-fit,minmax(min(${min}px,100%),1fr))` }}>
      {items.map((it, i) => (
        <Card key={it.title} tone={TINTS[i % TINTS.length]} wobble padding={26} tilt={[-1, 1, -0.5, 0.8][i % 4]} style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <Icon name={it.icon} weight="duotone" size={44} color="var(--ink-900)" />
          <h3 style={{ font: "var(--type-h4)" }}>{it.title}</h3>
          <p style={{ color: "var(--ink-700)" }}>{it.body}</p>
        </Card>
      ))}
    </div>
  );
}

export function Band({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <section style={{ padding: "clamp(24px,4vw,48px) 0 var(--section-y)" }}><div className="sl-wrap" style={{ maxWidth: narrow ? 860 : undefined, display: "grid", gap: 32 }}>{children}</div></section>;
}

export function CheckList({ items, tone = "mint" }: { items: readonly string[]; tone?: "mint" | "sun" }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
      {items.map((it) => (
        <li key={it} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 600, color: "var(--ink-800)" }}>
          <Icon name="check-circle" color={`var(--${tone}-500)`} size={24} style={{ flex: "none" }} />{it}
        </li>
      ))}
    </ul>
  );
}

export function CtaCard({ title, body, cta, href, icon = "magic-wand" }: { title: string; body?: string; cta: string; href: string; icon?: string }) {
  return (
    <Card tone="sky" variant="flat" padding="clamp(22px,3vw,32px)" style={{ display: "flex", gap: 18, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ font: "var(--type-h3)" }}>{title}</h2>
        {body && <p style={{ color: "var(--ink-700)" }}>{body}</p>}
      </div>
      <Button iconStart={icon} href={href}>{cta}</Button>
    </Card>
  );
}
