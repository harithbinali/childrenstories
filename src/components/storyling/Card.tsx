import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { vars } from "./types";

const TINT: Record<string, string> = {
  white: "var(--white)", paper: "var(--paper-2)", sun: "var(--tint-sun)", sky: "var(--tint-sky)", bubble: "var(--tint-bubble)",
  mint: "var(--tint-mint)", grape: "var(--tint-grape)", tangerine: "var(--tint-tangerine)", night: "var(--night-800)", blue: "var(--blue-500)",
};

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** Forwarded when `as` is a link component. */
  href?: string;
  tone?: keyof typeof TINT | string;
  variant?: "elevated" | "flat" | "sticker" | "outlined";
  wobble?: boolean;
  interactive?: boolean;
  padding?: number | string;
  tilt?: number;
  as?: ElementType;
  children?: ReactNode;
};

export function Card({ tone = "white", variant = "elevated", wobble, interactive, padding, tilt, as: Tag = "div", className = "", style, children, ...rest }: CardProps) {
  const cls = ["sl-card", variant !== "elevated" && `sl-card--${variant}`, wobble && "sl-card--wobble", interactive && "sl-card--interactive", className].filter(Boolean).join(" ");
  const dark = tone === "night" || tone === "blue";
  return (
    <Tag
      className={cls}
      style={vars({
        "--_tint": TINT[tone] ?? tone,
        "--_pad": typeof padding === "number" ? `${padding}px` : padding,
        ...(dark ? { color: "var(--white)" } : null),
        ...(tilt ? { transform: `rotate(${tilt}deg)` } : null),
        ...style,
      })}
      {...rest}
    >
      {children}
    </Tag>
  );
}
