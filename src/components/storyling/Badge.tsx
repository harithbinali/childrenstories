import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

const T = {
  sun: ["var(--sun-400)", "var(--ink-900)", "var(--sun-100)", "var(--sun-700)"],
  sky: ["var(--blue-500)", "#fff", "var(--blue-100)", "var(--blue-700)"],
  bubble: ["var(--bubble-500)", "#fff", "var(--bubble-100)", "var(--bubble-600)"],
  mint: ["var(--mint-500)", "#fff", "var(--mint-100)", "var(--mint-600)"],
  cherry: ["var(--cherry-500)", "#fff", "var(--cherry-100)", "var(--cherry-600)"],
  grape: ["var(--grape-500)", "#fff", "var(--grape-100)", "var(--grape-600)"],
  tangerine: ["var(--tangerine-500)", "#fff", "var(--tangerine-100)", "var(--tangerine-600)"],
  ink: ["var(--ink-900)", "#fff", "var(--ink-100)", "var(--ink-700)"],
} as const;

export type BadgeTone = keyof typeof T;

export function Badge({ tone = "sun", variant = "solid", icon, size = "md", children, style, ...rest }: HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone; variant?: "solid" | "soft"; icon?: string; size?: "sm" | "md"; children?: ReactNode;
}) {
  const t = T[tone] ?? T.sun;
  const solid = variant === "solid";
  const sm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: sm ? 22 : 28, padding: sm ? "0 9px" : "0 12px", borderRadius: 999,
        background: solid ? t[0] : t[2], color: solid ? t[1] : t[3], font: `800 ${sm ? 11 : 13}px/1 var(--font-body)`,
        textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={sm ? 12 : 14} />}
      {children}
    </span>
  );
}
