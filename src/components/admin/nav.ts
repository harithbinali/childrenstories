import type { Dictionary } from "@/i18n/dictionaries";
import type { NavItem } from "@/components/dashboard/AppShell";

/** Sections and who may open them. Staff run operations; admins also manage money, catalog and configuration. */
export const ADMIN_SECTIONS = [
  ["", "squares-four", "overview", false], ["/customers", "users-three", "customers", false], ["/children", "baby", "children", false],
  ["/characters", "user-circle", "characters", false], ["/books", "books", "books", false], ["/jobs", "gear-six", "jobs", false],
  ["/orders", "receipt", "orders", false], ["/payments", "credit-card", "payments", false], ["/refunds", "arrow-u-up-left", "refunds", false],
  ["/products", "tag", "products", true], ["/themes", "compass", "themes", true], ["/styles", "palette", "styles", true],
  ["/ai", "magic-wand", "ai", true], ["/limits", "gauge", "limits", true], ["/gateways", "bank", "gateways", true],
  ["/content", "megaphone", "content", true], ["/support", "lifebuoy", "support", false], ["/reports", "chart-bar", "reports", false],
  ["/audit-logs", "list-checks", "audit", true], ["/settings", "sliders-horizontal", "settings", true],
] as const;

export function adminNav(d: Dictionary, isAdmin: boolean): NavItem[] {
  return ADMIN_SECTIONS.filter(([, , , adminOnly]) => isAdmin || !adminOnly).map(([path, icon, key]) => ({ href: `/admin${path}`, icon, label: d.admin.nav[key] }));
}

export const ADMIN_MOBILE_PRIMARY = ["/admin", "/admin/books", "/admin/jobs", "/admin/support"];
