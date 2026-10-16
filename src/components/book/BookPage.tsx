import type { CSSProperties } from "react";
import { storyTypography, textRegion, type AgeRange, type Language, type Orientation, type TextPosition } from "@/lib/book/layout-spec";

/**
 * One book page, shared by the online reader and the PDF renderer.
 * Pure and hook-free so it can be rendered with renderToStaticMarkup.
 *
 * Sizing: the component fills its container, which must have the page's
 * aspect ratio. Font sizes are expressed relative to the page width
 * (container query units), so the page scales identically on a phone, a
 * tablet and a printed 8x12in sheet.
 *
 * Visual styling uses CSS custom properties (--book-*) defined by the
 * Storyling design tokens; fallbacks are neutral placeholders.
 */

export type BookPageProps = {
  kind: "front_cover" | "dedication" | "story" | "back_cover";
  orientation: Orientation;
  language: Language;
  ageRange: AgeRange;
  imageUrl?: string | null;
  text?: string;
  textPosition?: TextPosition;
  title?: string;
  subtitle?: string;
  pageNumber?: number | null;
  imageAlt?: string;
};

const TRIM_WIDTH_PT = { portrait: 576, landscape: 864 } as const;

/** Converts a size in points at print trim into page-width-relative units. */
const cqw = (pt: number, o: Orientation) => `${((pt / TRIM_WIDTH_PT[o]) * 100).toFixed(3)}cqw`;
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

export function BookPage(p: BookPageProps) {
  const dir = p.language === "ar" ? "rtl" : "ltr";
  const type = storyTypography(p.ageRange, p.language, p.orientation);
  const fontFamily = p.language === "ar" ? "var(--book-font-ar, 'Noto Naskh Arabic', serif)" : "var(--book-font-en, Georgia, serif)";

  const root: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    containerType: "inline-size",
    background: "var(--book-paper, #fffaf2)",
    color: "var(--book-ink, #2b2238)",
    fontFamily,
  };

  const art = p.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- shared with PDF rendering; next/image is unavailable there
    <img src={p.imageUrl} alt={p.imageAlt ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
  ) : null;

  if (p.kind === "front_cover") {
    return (
      <section dir={dir} lang={p.language} style={root} data-page-kind="front_cover">
        {art}
        <div style={{ position: "absolute", insetInline: "6%", top: "5%", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: cqw(p.language === "ar" ? 46 : 42, p.orientation), lineHeight: 1.15, fontWeight: 700, color: "var(--book-title, #2b2238)", textShadow: "0 0.4cqw 1.2cqw rgba(255,255,255,0.85)" }}>
            {p.title}
          </h1>
          {p.subtitle ? <p style={{ margin: "1.5cqw 0 0", fontSize: cqw(18, p.orientation) }}>{p.subtitle}</p> : null}
        </div>
      </section>
    );
  }

  if (p.kind === "dedication" || p.kind === "back_cover") {
    return (
      <section dir={dir} lang={p.language} style={root} data-page-kind={p.kind}>
        {art}
        {p.text ? (
          <div style={{ position: "absolute", inset: "12%", display: "grid", placeItems: "center", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: cqw(type.fontSizePt, p.orientation), lineHeight: type.lineHeight, fontStyle: p.language === "ar" ? "normal" : "italic", whiteSpace: "pre-line" }}>{p.text}</p>
          </div>
        ) : null}
      </section>
    );
  }

  const r = textRegion(p.orientation, p.textPosition ?? "bottom", p.language);
  return (
    <section dir={dir} lang={p.language} style={root} data-page-kind="story">
      {art}
      <div
        style={{
          position: "absolute",
          // Physical coordinates: textRegion already resolved RTL mirroring.
          left: pct(r.x),
          top: pct(r.y),
          width: pct(r.width),
          height: pct(r.height),
          display: "flex",
          alignItems: p.textPosition === "top" ? "flex-start" : p.textPosition === "bottom" ? "flex-end" : "center",
        }}
      >
        <p
          style={{
            margin: 0,
            width: "100%",
            padding: "2.4cqw 3cqw",
            borderRadius: "var(--book-panel-radius, 3cqw)",
            background: "var(--book-panel, rgba(255, 250, 242, 0.9))",
            boxShadow: "var(--book-panel-shadow, 0 0.6cqw 2cqw rgba(43, 34, 56, 0.12))",
            fontSize: cqw(type.fontSizePt, p.orientation),
            lineHeight: type.lineHeight,
            textAlign: type.align,
            whiteSpace: "pre-line",
          }}
        >
          {p.text}
        </p>
      </div>
      {p.pageNumber ? (
        <span aria-hidden style={{ position: "absolute", bottom: "1.6%", insetInlineEnd: "3%", fontSize: cqw(12, p.orientation), opacity: 0.7 }}>
          {p.language === "ar" ? p.pageNumber.toLocaleString("ar-EG") : p.pageNumber}
        </span>
      ) : null}
    </section>
  );
}
