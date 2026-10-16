import { adminMetadata, adminRoute } from "@/components/admin/page";
import { CatalogAdminView } from "@/components/admin/views/ConfigViews";
import { getThemes } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.themes);

export default adminRoute(async ({ d, locale }) => <CatalogAdminView d={d} locale={locale} rows={await getThemes()} kind="theme" />, { admin: true });
