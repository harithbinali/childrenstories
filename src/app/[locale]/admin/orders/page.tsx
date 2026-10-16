import { adminMetadata, adminRoute } from "@/components/admin/page";
import { OrdersAdminView } from "@/components/admin/views/MoneyViews";
import { listParams } from "@/components/admin/ui";
import { listOrders } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.orders);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  return <OrdersAdminView d={d} locale={locale} data={await listOrders(p)} params={p.raw} />;
});
