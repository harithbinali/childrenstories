"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

const T: Record<string, string> = { sun: "var(--sun-400)", sky: "var(--blue-500)", bubble: "var(--bubble-500)", mint: "var(--mint-500)", cherry: "var(--cherry-500)", grape: "var(--grape-500)" };

export function Dialog({ open, onClose, title, icon, tone = "sun", actions, children, width = 480, inline, closeLabel = "Close" }: {
  open: boolean; onClose?: () => void; title?: ReactNode; icon?: string; tone?: string; actions?: ReactNode; children?: ReactNode; width?: number; inline?: boolean; closeLabel?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || inline) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); previous?.focus?.(); };
  }, [open, onClose, inline]);
  if (!open) return null;
  const panel = (
    <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal={!inline} aria-label={typeof title === "string" ? title : undefined} className="sl-pop-in" onClick={(e) => e.stopPropagation()}
      style={{ position: "relative", width: "100%", maxWidth: width, background: "var(--white)", borderRadius: "var(--radius-xl)", padding: icon ? "52px 32px 28px" : "32px", boxShadow: "var(--shadow-float)", textAlign: icon ? "center" : "start", marginTop: icon ? 36 : 0, outline: "none" }}>
      {icon && <span style={{ position: "absolute", top: -40, left: "50%", marginLeft: -40, width: 80, height: 80, borderRadius: "50%", background: T[tone] ?? tone, display: "grid", placeItems: "center", boxShadow: "var(--shadow-sticker)", color: tone === "sun" ? "var(--ink-900)" : "#fff" }}><Icon name={icon} size={40} /></span>}
      {onClose && <IconButton icon="x" label={closeLabel} variant="ghost" size="sm" onClick={onClose} style={{ position: "absolute", top: 14, insetInlineEnd: 14 }} />}
      {title && <h2 style={{ font: "var(--type-h3)", color: "var(--text-strong)", marginBottom: 10 }}>{title}</h2>}
      <div style={{ font: "var(--type-body)", color: "var(--text-body)" }}>{children}</div>
      {actions && <div style={{ display: "flex", gap: 12, marginTop: 26, justifyContent: icon ? "center" : "flex-end", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
  if (inline) return panel;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)" as unknown as number, background: "var(--surface-overlay)", backdropFilter: "blur(var(--blur-overlay))", display: "grid", placeItems: "center", padding: 20, animation: "sl-fade-in var(--dur-base) var(--ease-soft)" }}>
      {panel}
    </div>
  );
}
