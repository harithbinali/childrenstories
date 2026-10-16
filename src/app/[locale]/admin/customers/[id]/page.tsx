import { adminMetadata, adminRoute } from "@/components/admin/page";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CustomerDetailView } from "@/components/admin/views/PeopleViews";
import { getCustomer } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.customers);

export default adminRoute(async ({ d, locale, params, isAdmin }) => {
  const c = await getCustomer((await params).id);
  if (!c) notFound();
  await connection();
  return <CustomerDetailView d={d} locale={locale} c={c} isAdmin={isAdmin} now={Date.now()} />;
});
