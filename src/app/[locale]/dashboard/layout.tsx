import { Suspense } from "react";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { AppShell } from "@/components/dashboard/AppShell";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { MOBILE_PRIMARY, dashboardNav } from "@/components/dashboard/nav";
import { Wordmark } from "@/components/marketing/Wordmark";
import { getSessionUser, isStaff, requireUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";

export const metadata = { robots: { index: false, follow: false } };

async function Shell({ d, locale, children }: { d: Dictionary; locale: Locale; children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  return (
    <AppShell
      brand={<Wordmark name={d.brand} href="/dashboard" />}
      nav={dashboardNav(d, isStaff(await getSessionUser()))}
      mobilePrimary={MOBILE_PRIMARY}
      moreLabel={d.dashboard.more}
      sidebarFooter={<AccountCard d={d} locale={locale} name={user.displayName} email={user.email} />}
    >
      {children}
    </AppShell>
  );
}

export default async function DashboardLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--paper)" }} />}>
      <Shell d={d} locale={l}>{children}</Shell>
    </Suspense>
  );
}
