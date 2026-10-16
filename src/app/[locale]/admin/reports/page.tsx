import { adminMetadata, adminRoute } from "@/components/admin/page";
import { ReportsView } from "@/components/admin/views/InsightViews";
import { getReport } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.reports);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const raw = Number((await searchParams).days);
  const days = [7, 30, 90, 365].includes(raw) ? raw : 30;
  return <ReportsView d={d} locale={locale} r={await getReport(days)} days={days} />;
});
