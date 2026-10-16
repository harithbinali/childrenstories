import type { CSSProperties, HTMLAttributes } from "react";

/** Directional glyphs that mirror automatically in RTL. */
const FLIP = new Set([
  "arrow-right", "arrow-left", "caret-right", "caret-left", "arrow-up-right", "arrow-circle-right",
  "arrow-circle-left", "caret-double-right", "caret-double-left", "sign-out", "paper-plane-right", "paper-plane-tilt",
]);

export type IconWeight = "fill" | "bold" | "duotone";

export type IconProps = Omit<HTMLAttributes<HTMLElement>, "color"> & {
  name: string;
  weight?: IconWeight;
  size?: number | string;
  color?: string;
  flipRtl?: boolean;
  /** Accessible label; omit for decorative icons. */
  label?: string;
};

/** Phosphor icon (self-hosted webfont). Storyling uses no emoji or unicode symbols as icons. */
export function Icon({ name, weight = "fill", size, color, flipRtl, label, className = "", style, ...rest }: IconProps) {
  const flip = flipRtl ?? FLIP.has(name);
  const s: CSSProperties = { fontSize: size, color, lineHeight: 1, display: "inline-block", flex: "none", ...style };
  return (
    <i
      className={`ph-${weight} ph-${name} ${flip ? "sl-flip-rtl" : ""} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={s}
      {...rest}
    />
  );
}
