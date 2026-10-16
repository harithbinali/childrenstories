import { adminMetadata, adminRoute } from "@/components/admin/page";
import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/admin/views/MoneyViews";
import { getOrder } from "@/lib/admin/queries";
import { hasEnv } from "@/lib/env";

export const generateMetadata = adminMetadata((d) => d.admin.nav.orders);

export default adminRoute(async ({ d, locale, params, isAdmin }) => {
  const o = await getOrder((await params).id);
  if (!o) notFound();
  const configured = o.gateway === "stripe" ? hasEnv("STRIPE_SECRET_KEY") : o.gateway === "paypal" ? hasEnv("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET") : false;
  return <OrderDetailView d={d} locale={locale} o={o} isAdmin={isAdmin} gatewayConfigured={configured} />;
});
