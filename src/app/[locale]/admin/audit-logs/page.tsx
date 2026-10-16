import { adminMetadata, adminRoute } from "@/components/admin/page";
import { AuditAdminView } from "@/components/admin/views/OpsViews";
import { listParams } from "@/components/admin/ui";
import { emailsFor, listAudit } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.audit);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  const data = await listAudit(p);
  return <AuditAdminView d={d} locale={locale} data={data} params={p.raw} emails={await emailsFor(data.rows.map((r) => r.actor_id))} />;
}, { admin: true });
