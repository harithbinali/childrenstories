import type { ReactNode } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { Wordmark } from "@/components/marketing/Wordmark";
import { Badge } from "@/components/storyling";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ADMIN_MOBILE_PRIMARY, adminNav } from "./nav";

export function AdminFrame({ d, locale, isAdmin, name, email, children }: { d: Dictionary; locale: Locale; isAdmin: boolean; name: string | null; email: string | null; children: ReactNode }) {
  return (
    <AppShell
      brand={<span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><Wordmark name={d.brand} href="/admin" size={26} /><Badge size="sm" tone="ink">{d.admin.title}</Badge></span>}
      nav={[...adminNav(d, isAdmin), { href: "/dashboard", icon: "arrow-u-up-left", label: d.admin.backToApp }]}
      mobilePrimary={ADMIN_MOBILE_PRIMARY}
      moreLabel={d.dashboard.more}
      dense
      sidebarFooter={<AccountCard d={d} locale={locale} name={name} email={email} />}
    >
      {children}
    </AppShell>
  );
}
