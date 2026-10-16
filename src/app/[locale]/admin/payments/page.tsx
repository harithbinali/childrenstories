import { adminMetadata, adminRoute } from "@/components/admin/page";
import { PaymentsAdminView } from "@/components/admin/views/MoneyViews";
import { listParams } from "@/components/admin/ui";
import { listPayments, listWebhookEvents } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.payments);

export default adminRoute(async ({ d, locale, searchParams, isAdmin }) => {
  const p = await listParams(searchParams);
  const onlyErrors = (await searchParams).errors === "1";
  const [data, events] = await Promise.all([listPayments(p), isAdmin ? listWebhookEvents(onlyErrors) : []]);
  return <PaymentsAdminView d={d} locale={locale} data={data} params={p.raw} events={events} isAdmin={isAdmin} />;
});
