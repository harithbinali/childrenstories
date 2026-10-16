"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/storyling";

export type NavItem = { href: string; icon: string; label: string; primary?: boolean };

function isActive(pathname: string, href: string) {
  // Paths may carry an explicit locale prefix (/ar/dashboard/...).
  const p = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  // Section roots are only active on themselves, not on every page below them.
  return href === "/dashboard" || href === "/admin" ? p === href : p === href || p.startsWith(`${href}/`);
}

function NavLink({ item, active, compact, dense }: { item: NavItem; active: boolean; compact?: boolean; dense?: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", flexDirection: compact ? "column" : "row", alignItems: "center", gap: compact ? 4 : 14,
        padding: compact ? "8px 4px" : dense ? "5px 12px" : "10px 14px", borderRadius: 22, textDecoration: "none", flex: compact ? 1 : "none", minWidth: 0,
        background: active && !compact ? "var(--white)" : "transparent", boxShadow: active && !compact ? "var(--shadow-soft)" : "none",
        color: active ? "var(--blue-700)" : "var(--ink-500)", font: compact ? "700 12px/1 var(--font-body)" : dense ? "600 15px/1 var(--font-display)" : "600 17px/1 var(--font-display)",
        transition: "all var(--dur-fast) var(--ease-bounce)",
      }}
    >
      <span style={{
        width: compact ? 44 : dense ? 32 : 40, height: compact ? 32 : dense ? 32 : 40, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 22, flex: "none",
        background: active ? "var(--sun-400)" : "transparent", color: active ? "var(--ink-900)" : "inherit",
        transform: active ? "rotate(-6deg)" : "none", transition: "all var(--dur-base) var(--ease-bounce)",
      }}>
        <Icon name={item.icon} />
      </span>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
    </Link>
  );
}

/**
 * Parent app shell (Storyling app kit): sticky sidebar ≥900px, floating
 * bottom tab bar on smaller screens with a "More" sheet for the rest.
 */
export function AppShell({ brand, nav, mobilePrimary, moreLabel, sidebarFooter, children, dense }: {
  brand: ReactNode; nav: NavItem[]; mobilePrimary: string[]; moreLabel: string; sidebarFooter: ReactNode; children: ReactNode;
  /** Tighter sidebar for long navigation (admin). */
  dense?: boolean;
}) {
  const pathname = usePathname();
  const [moreOn, setMoreOn] = useState<string | null>(null);
  const moreOpen = moreOn === pathname;
  const primary = nav.filter((n) => mobilePrimary.includes(n.href));
  const rest = nav.filter((n) => !mobilePrimary.includes(n.href));
  return (
    <div style={{ minHeight: "100dvh", display: "flex", background: "var(--paper)" }}>
      <aside className="hidden wide:flex" style={{ width: 268, flex: "none", padding: 22, flexDirection: "column", gap: 4, background: "var(--paper-2)", borderStartEndRadius: 40, borderEndEndRadius: 40, position: "sticky", top: 0, height: "100dvh", overflowY: "auto" }}>
        <div style={{ padding: "8px 10px 22px" }}>{brand}</div>
        <nav aria-label="Dashboard" style={{ display: "grid", gap: 4 }}>
          {nav.map((n) => <NavLink key={n.href} item={n} active={isActive(pathname, n.href)} dense={dense} />)}
        </nav>
        <div style={{ flex: 1 }} />
        {sidebarFooter}
      </aside>
      <main id="main" style={{ flex: 1, minWidth: 0 }} className="pb-28 wide:pb-0">{children}</main>

      {/* display comes from the classes: inline display would override wide:hidden */}
      <nav aria-label="Dashboard" className="flex wide:hidden" style={{ position: "fixed", insetInline: 12, bottom: 12, zIndex: 50, background: "#fff", borderRadius: 28, padding: 6, boxShadow: "var(--shadow-float)" }}>
        {primary.map((n) => <NavLink key={n.href} item={n} compact active={isActive(pathname, n.href)} />)}
        <button type="button" aria-expanded={moreOpen} aria-controls="more-sheet" onClick={() => setMoreOn(moreOpen ? null : pathname)}
          style={{ flex: 1, border: 0, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", font: "700 12px/1 var(--font-body)", color: moreOpen ? "var(--blue-700)" : "var(--ink-500)", cursor: "pointer" }}>
          <span style={{ width: 44, height: 32, display: "grid", placeItems: "center", fontSize: 22 }}><Icon name={moreOpen ? "x" : "dots-three-outline"} /></span>
          {moreLabel}
        </button>
      </nav>
      {moreOpen && (
        <div id="more-sheet" className="grid wide:hidden sl-pop-in" style={{ position: "fixed", insetInline: 12, bottom: 96, zIndex: 49, background: "#fff", borderRadius: 28, padding: 12, boxShadow: "var(--shadow-float)", gap: 4, maxHeight: "70dvh", overflowY: "auto" }}>
          {rest.map((n) => <NavLink key={n.href} item={n} active={isActive(pathname, n.href)} />)}
          <div style={{ borderTop: "2px dashed var(--ink-100)", marginTop: 6, paddingTop: 10 }}>{sidebarFooter}</div>
        </div>
      )}
    </div>
  );
}
