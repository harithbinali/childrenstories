"use client";
import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { Icon } from "./Icon";

export type TabItem = string | { id: string; label: string; icon?: string };

/** Pill tabs. Arrow keys move between tabs (direction-aware). */
export function Tabs({ items = [], value, onChange, label, style }: { items: TabItem[]; value: string; onChange?: (id: string) => void; label?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const ids = items.map((it) => (typeof it === "string" ? it : it.id));
  const onKey = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const i = ids.indexOf(value);
    const fwd = (e.key === "ArrowRight") !== rtl;
    const next = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : (i + (fwd ? 1 : -1) + ids.length) % ids.length;
    e.preventDefault();
    onChange?.(ids[next]);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };
  return (
    <div ref={ref} role="tablist" aria-label={label} className="sl-tabs" style={style} onKeyDown={onKey}>
      {items.map((it) => {
        const id = typeof it === "string" ? it : it.id;
        const text = typeof it === "string" ? it : it.label;
        const selected = value === id;
        return (
          <button key={id} role="tab" type="button" className="sl-tab" aria-selected={selected} tabIndex={selected ? 0 : -1} onClick={() => onChange?.(id)}>
            {typeof it !== "string" && it.icon && <Icon name={it.icon} />}
            {text}
          </button>
        );
      })}
    </div>
  );
}
