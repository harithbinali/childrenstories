import { adminMetadata, adminRoute } from "@/components/admin/page";
import { LIMIT_KEYS, LimitsAdminView } from "@/components/admin/views/ConfigViews";
import { getPlatformSettings } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.limits);

export default adminRoute(async ({ d }) => <LimitsAdminView d={d} values={await getPlatformSettings(LIMIT_KEYS)} />, { admin: true });
