import { adminMetadata, adminRoute } from "@/components/admin/page";
import { JobsAdminView } from "@/components/admin/views/OpsViews";
import { listParams } from "@/components/admin/ui";
import { listJobs } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.jobs);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  return <JobsAdminView d={d} locale={locale} data={await listJobs(p)} params={p.raw} />;
});
