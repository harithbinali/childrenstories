import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

const R = ["var(--radius-blob-1)", "var(--radius-blob-2)", "var(--radius-blob-3)", "var(--radius-blob-4)"];
const T: Record<string, [string, string]> = {
  sky: ["var(--blue-100)", "var(--blue-400)"], sun: ["var(--sun-100)", "var(--sun-500)"], bubble: ["var(--bubble-100)", "var(--bubble-500)"],
  mint: ["var(--mint-100)", "var(--mint-500)"], grape: ["var(--grape-100)", "var(--grape-500)"], tangerine: ["var(--tangerine-100)", "var(--tangerine-500)"],
};

/** Organic image frame. Without `src` it renders the Storyling illustration placeholder. */
export function BlobFrame({ src, alt = "", shape = 1, tone = "sky", icon = "image", label = "Illustration", aspect = "1/1", sticker = true, className, style, children }: {
  src?: string | null; alt?: string; shape?: 1 | 2 | 3 | 4; tone?: keyof typeof T; icon?: string; label?: string; aspect?: string; sticker?: boolean; className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  const t = T[tone] ?? T.sky;
  return (
    <div className={className} style={{ position: "relative", aspectRatio: aspect, borderRadius: R[(shape - 1) % 4], overflow: "hidden", background: t[0], boxShadow: sticker ? "var(--shadow-sticker)" : "none", ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated art served from storage
        <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ position: "absolute", inset: "9%", borderRadius: "inherit", border: `3px dashed ${t[1]}`, opacity: 0.6, display: "grid", placeItems: "center", alignContent: "center", gap: 6, color: t[1], textAlign: "center" }}>
          <Icon name={icon} weight="duotone" size={56} />
          <span style={{ font: "700 13px/1.2 var(--font-body)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
        </div>
      )}
      {children}
    </div>
  );
}
