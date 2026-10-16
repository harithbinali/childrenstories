import { adminMetadata, adminRoute } from "@/components/admin/page";
import { SupportAdminView } from "@/components/admin/views/OpsViews";
import { listParams } from "@/components/admin/ui";
import { emailsFor, listTickets } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.support);

export default adminRoute(async ({ d, locale, searchParams, user }) => {
  const p = await listParams(searchParams);
  const assignee = (await searchParams).assignee;
  const data = await listTickets({ ...p, assignee: typeof assignee === "string" && /^[0-9a-f-]{36}$/i.test(assignee) ? assignee : undefined });
  const emails = await emailsFor(data.rows.flatMap((r) => [r.owner_id, r.assigned_to]));
  return <SupportAdminView d={d} locale={locale} data={data} params={p.raw} emails={emails} me={user.id} />;
});
