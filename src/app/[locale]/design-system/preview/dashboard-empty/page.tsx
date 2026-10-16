import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { AppShell } from "@/components/dashboard/AppShell";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { MOBILE_PRIMARY, dashboardNav } from "@/components/dashboard/nav";
import { Wordmark } from "@/components/marketing/Wordmark";
import { previewOverview } from "@/lib/preview-fixtures";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Gate } from "../../gate";

export const metadata: Metadata = { title: "Preview · Dashboard", robots: { index: false, follow: false } };

/** Parent dashboard with preview data (no login or database). Internal only. */
export default async function DashboardPreview() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  const data = previewOverview(l, true);
  return (
    <Suspense fallback={null}>
      <Gate>
        <AppShell brand={<Wordmark name={d.brand} />} nav={dashboardNav(d, false)} mobilePrimary={MOBILE_PRIMARY} moreLabel={d.dashboard.more}
          sidebarFooter={<AccountCard d={d} locale={l} name={data.displayName} email="hana@example.com" />}>
          <DashboardHome d={d} locale={l} data={data} />
        </AppShell>
      </Gate>
    </Suspense>
  );
}
