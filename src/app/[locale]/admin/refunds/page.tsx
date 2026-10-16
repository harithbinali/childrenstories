import { adminMetadata, adminRoute } from "@/components/admin/page";
import { RefundsAdminView } from "@/components/admin/views/MoneyViews";
import { listParams } from "@/components/admin/ui";
import { emailsFor, listRefunds } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.refunds);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  const data = await listRefunds(p);
  return <RefundsAdminView d={d} locale={locale} data={data} params={p.raw} emails={await emailsFor(data.rows.map((r) => r.requested_by))} />;
});
