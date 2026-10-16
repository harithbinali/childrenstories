import { adminMetadata, adminRoute } from "@/components/admin/page";
import { CustomersView } from "@/components/admin/views/PeopleViews";
import { listParams } from "@/components/admin/ui";
import { listCustomers } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.customers);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  return <CustomersView d={d} locale={locale} data={await listCustomers(p)} params={p.raw} />;
});
