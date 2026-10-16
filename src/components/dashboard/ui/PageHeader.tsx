import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/storyling";

export function PageHeader({ title, sub, eyebrow, actions, back }: { title: ReactNode; sub?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end", justifyContent: "space-between" }}>
      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
        {back && (
          <Link href={back.href} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "700 14px var(--font-body)", width: "fit-content" }}>
            <Icon name="arrow-left" weight="bold" />{back.label}
          </Link>
        )}
        {eyebrow && <div className="sl-eyebrow">{eyebrow}</div>}
        <h1 style={{ font: "var(--type-h2)" }}>{title}</h1>
        {sub && <p style={{ color: "var(--ink-700)", maxWidth: 620 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div style={{ padding: "clamp(20px,4vw,44px)", display: "flex", flexDirection: "column", gap: 32, maxWidth: 1180 }}>{children}</div>;
}
