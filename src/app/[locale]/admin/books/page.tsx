import { adminMetadata, adminRoute } from "@/components/admin/page";
import { BooksAdminView } from "@/components/admin/views/OpsViews";
import { listParams } from "@/components/admin/ui";
import { emailsFor, listBooks } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.books);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  const data = await listBooks(p);
  return <BooksAdminView d={d} locale={locale} data={data} params={p.raw} emails={await emailsFor(data.rows.map((r) => r.owner_id))} />;
});
