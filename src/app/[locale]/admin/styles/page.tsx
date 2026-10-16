import { adminMetadata, adminRoute } from "@/components/admin/page";
import { CatalogAdminView } from "@/components/admin/views/ConfigViews";
import { getStyles } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.styles);

export default adminRoute(async ({ d, locale }) => <CatalogAdminView d={d} locale={locale} rows={await getStyles()} kind="style" />, { admin: true });
