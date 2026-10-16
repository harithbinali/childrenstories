import { adminMetadata, adminRoute } from "@/components/admin/page";
import { OverviewView } from "@/components/admin/views/InsightViews";
import { getOverview } from "@/lib/admin/queries";
import { hasEnv } from "@/lib/env";

export const generateMetadata = adminMetadata((d) => d.admin.nav.overview);

export default adminRoute(async ({ d, locale }) => <OverviewView d={d} locale={locale} o={hasEnv("NEXT_PUBLIC_SUPABASE_URL") ? await getOverview() : null} />);
