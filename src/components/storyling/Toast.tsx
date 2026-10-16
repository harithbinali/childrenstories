"use client";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

const T = { mint: ["var(--mint-500)", "check-circle"], sun: ["var(--sun-400)", "star"], sky: ["var(--blue-500)", "info"], cherry: ["var(--cherry-500)", "warning-circle"], grape: ["var(--grape-500)", "sparkle"] } as const;

export function Toast({ tone = "mint", icon, title, message, action, onClose, dismissLabel = "Dismiss", style }: {
  tone?: keyof typeof T; icon?: string; title?: ReactNode; message?: ReactNode; action?: ReactNode; onClose?: () => void; dismissLabel?: string; style?: CSSProperties;
}) {
  const t = T[tone] ?? T.mint;
  return (
    <div role="status" className="sl-pop-in" style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, paddingInlineEnd: onClose ? 8 : 20, background: "var(--white)", borderRadius: 24, boxShadow: "var(--shadow-float)", maxWidth: 440, ...style }}>
      <span style={{ flex: "none", width: 44, height: 44, borderRadius: 16, display: "grid", placeItems: "center", background: t[0], color: tone === "sun" ? "var(--ink-900)" : "#fff", transform: "rotate(-6deg)" }}><Icon name={icon ?? t[1]} size={24} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ font: "600 17px/1.25 var(--font-display)", color: "var(--ink-900)" }}>{title}</div>}
        {message && <div style={{ font: "600 14px/1.4 var(--font-body)", color: "var(--ink-500)" }}>{message}</div>}
      </div>
      {action}
      {onClose && <IconButton icon="x" label={dismissLabel} variant="ghost" size="sm" onClick={onClose} />}
    </div>
  );
}
