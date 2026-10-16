import type { CSSProperties } from "react";

export function Scallop({ color = "var(--white)", size = 28, edge = "bottom", style }: { color?: string; size?: number; edge?: "bottom" | "top"; style?: CSSProperties }) {
  const r = size / 2;
  return (
    <div aria-hidden="true" style={{ height: r, background: `radial-gradient(circle at 50% ${edge === "bottom" ? "0" : "100%"}, ${color} ${r - 0.5}px, transparent ${r}px) 0 0 / ${size}px ${r}px repeat-x`, ...style }} />
  );
}
