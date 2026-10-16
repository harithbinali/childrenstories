import { adminMetadata, adminRoute } from "@/components/admin/page";
import { AiAdminView } from "@/components/admin/views/ConfigViews";
import { getAiSettings, getPlatformSettings } from "@/lib/admin/queries";
import { hasEnv } from "@/lib/env";

export const generateMetadata = adminMetadata((d) => d.admin.nav.ai);

export default adminRoute(async ({ d }) => {
  const [settings, numbers] = await Promise.all([getAiSettings(), getPlatformSettings(["limits.worker_concurrency", "limits.daily_platform_spend_usd"])]);
  return <AiAdminView d={d} settings={settings} numbers={numbers} keyConfigured={hasEnv("OPENAI_API_KEY")} />;
}, { admin: true });
