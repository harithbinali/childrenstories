import type { CSSProperties } from "react";

/** Style object that may also carry CSS custom properties (e.g. "--_tint"). */
export type StyleWithVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

export const vars = (s: StyleWithVars) => s as CSSProperties;

export type Tone = "sun" | "sky" | "bubble" | "mint" | "grape" | "tangerine";
