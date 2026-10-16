import { adminMetadata, adminRoute } from "@/components/admin/page";
import { GatewaysAdminView } from "@/components/admin/views/ConfigViews";
import { getGateways } from "@/lib/admin/queries";
import { hasEnv } from "@/lib/env";

export const generateMetadata = adminMetadata((d) => d.admin.nav.gateways);

export default adminRoute(async ({ d }) => (
  <GatewaysAdminView d={d} gateways={await getGateways()} configured={{
    stripe: hasEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"),
    paypal: hasEnv("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"),
  }} />
), { admin: true });
