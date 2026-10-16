import { adminMetadata, adminRoute } from "@/components/admin/page";
import { CharactersAdminView } from "@/components/admin/views/PeopleViews";
import { listParams } from "@/components/admin/ui";
import { emailsFor, listCharacters } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.characters);

export default adminRoute(async ({ d, locale, searchParams }) => {
  const p = await listParams(searchParams);
  const data = await listCharacters(p);
  return <CharactersAdminView d={d} locale={locale} data={data} params={p.raw} emails={await emailsFor(data.rows.map((r) => r.owner_id))} />;
});
