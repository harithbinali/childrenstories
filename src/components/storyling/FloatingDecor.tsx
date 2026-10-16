import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { vars } from "./types";

export type DecorItem = {
  icon: string; color: string; size: number; top?: string; bottom?: string; start?: string; end?: string;
  anim?: "float" | "twinkle" | "drift" | "wiggle"; delay?: number; rotate?: number;
};

const PRESETS: Record<string, DecorItem[]> = {
  sky: [
    { icon: "cloud", color: "#fff", size: 72, top: "8%", start: "4%", anim: "drift" },
    { icon: "star", color: "var(--sun-400)", size: 26, top: "18%", end: "8%", anim: "twinkle" },
    { icon: "sparkle", color: "var(--bubble-400)", size: 22, bottom: "22%", start: "10%", anim: "twinkle", delay: 0.8 },
    { icon: "cloud", color: "#fff", size: 48, bottom: "12%", end: "6%", anim: "drift", delay: 2 },
    { icon: "star", color: "var(--blue-400)", size: 18, top: "48%", end: "3%", anim: "twinkle", delay: 1.4 },
  ],
  night: [
    { icon: "moon-stars", color: "var(--sun-400)", size: 56, top: "10%", end: "8%", anim: "float" },
    { icon: "star", color: "var(--sun-200)", size: 16, top: "20%", start: "12%", anim: "twinkle" },
    { icon: "star", color: "#fff", size: 12, top: "60%", start: "6%", anim: "twinkle", delay: 0.6 },
    { icon: "sparkle", color: "var(--grape-400)", size: 22, bottom: "18%", end: "14%", anim: "twinkle", delay: 1.1 },
    { icon: "star-four", color: "var(--sun-200)", size: 14, top: "38%", end: "30%", anim: "twinkle", delay: 1.8 },
  ],
  magic: [
    { icon: "star", color: "var(--sun-400)", size: 30, top: "6%", start: "6%", anim: "twinkle", rotate: -12 },
    { icon: "sparkle", color: "var(--bubble-500)", size: 24, top: "14%", end: "10%", anim: "twinkle", delay: 0.5 },
    { icon: "heart", color: "var(--cherry-400)", size: 20, bottom: "18%", start: "4%", anim: "float", rotate: -14 },
    { icon: "paper-plane-tilt", color: "var(--grape-400)", size: 34, bottom: "10%", end: "5%", anim: "float", rotate: 8 },
    { icon: "star-four", color: "var(--blue-400)", size: 18, top: "50%", start: "2%", anim: "twinkle", delay: 1.2 },
  ],
};

/** Ambient floating icons (≤6 per area). Never placed over text; disabled under reduced motion. */
/** "magic" variant that keeps to the trailing edge, for cards whose text starts at the leading edge. */
PRESETS.magicEdge = [
  // Corner zones only: text runs nearly full width on phones.
  { icon: "star", color: "var(--sun-500)", size: 24, top: "4%", end: "3%", anim: "twinkle", rotate: -12 },
  { icon: "sparkle", color: "var(--bubble-500)", size: 20, bottom: "26%", end: "4%", anim: "twinkle", delay: 0.5 },
  { icon: "heart", color: "var(--cherry-400)", size: 18, bottom: "6%", end: "20%", anim: "float", rotate: -14 },
  { icon: "paper-plane-tilt", color: "var(--grape-400)", size: 30, bottom: "8%", end: "4%", anim: "float", rotate: 8 },
];

export function FloatingDecor({ preset = "sky", items, style }: { preset?: "sky" | "night" | "magic" | "magicEdge"; items?: DecorItem[]; style?: CSSProperties }) {
  const list = items ?? PRESETS[preset] ?? PRESETS.sky;
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", ...style }}>
      {list.map((it, i) => (
        <span key={i} className={it.anim ? `sl-${it.anim}` : ""}
          style={vars({
            position: "absolute", top: it.top, bottom: it.bottom, insetInlineStart: it.start, insetInlineEnd: it.end,
            "--sl-rot": `${it.rotate ?? 0}deg`, transform: `rotate(${it.rotate ?? 0}deg)`, animationDelay: `${it.delay ?? 0}s`,
            filter: it.color === "#fff" ? "drop-shadow(0 6px 10px rgba(27,36,87,.12))" : undefined,
          })}>
          <Icon name={it.icon} size={it.size} color={it.color} />
        </span>
      ))}
    </div>
  );
}
