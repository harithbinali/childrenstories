import type { Dictionary } from "@/i18n/dictionaries";
import type { NavItem } from "./AppShell";

export function dashboardNav(d: Dictionary, staff: boolean): NavItem[] {
  const n = d.dashboard.nav;
  return [
    { href: "/dashboard", icon: "house", label: n.overview },
    { href: "/dashboard/children", icon: "baby", label: n.children },
    { href: "/dashboard/characters", icon: "user-circle", label: n.characters },
    { href: "/dashboard/create", icon: "magic-wand", label: n.create },
    { href: "/dashboard/books", icon: "books", label: n.books },
    { href: "/dashboard/drafts", icon: "note-pencil", label: n.drafts },
    { href: "/dashboard/favorites", icon: "heart", label: n.favorites },
    { href: "/dashboard/orders", icon: "receipt", label: n.orders },
    { href: "/dashboard/settings", icon: "gear-six", label: n.settings },
    { href: "/dashboard/support", icon: "lifebuoy", label: n.support },
    ...(staff ? [{ href: "/admin", icon: "shield-star", label: n.admin }] : []),
  ];
}

export const MOBILE_PRIMARY = ["/dashboard", "/dashboard/children", "/dashboard/create", "/dashboard/books"];
