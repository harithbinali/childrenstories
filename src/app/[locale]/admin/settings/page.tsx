import { adminMetadata, adminRoute } from "@/components/admin/page";
import { SettingsAdminView } from "@/components/admin/views/ConfigViews";
import { getPlatformSettings } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.settings);

export default adminRoute(async ({ d }) => <SettingsAdminView d={d} values={await getPlatformSettings(["brand.name", "brand.support_email", "retention.child_photo_days", "features.google_auth", "features.design_system_public"])} />, { admin: true });
