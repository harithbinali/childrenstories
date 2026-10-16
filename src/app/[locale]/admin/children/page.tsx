import { adminMetadata, adminRoute } from "@/components/admin/page";
import { ChildrenAdminView } from "@/components/admin/views/PeopleViews";
import { listParams } from "@/components/admin/ui";
import { emailsFor, listChildren } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.children);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  const data = await listChildren(p);
  return <ChildrenAdminView d={d} locale={locale} data={data} params={p.raw} emails={await emailsFor(data.rows.map((r) => r.owner_id))} />;
});
