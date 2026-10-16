import { adminMetadata, adminRoute } from "@/components/admin/page";
import { ContentAdminView } from "@/components/admin/views/ConfigViews";
import { getMarketingContentRows } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.content);

export default adminRoute(async ({ d, locale }) => <ContentAdminView d={d} locale={locale} rows={await getMarketingContentRows()} />, { admin: true });
