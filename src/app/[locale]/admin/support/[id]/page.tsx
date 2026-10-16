import { adminMetadata, adminRoute } from "@/components/admin/page";
import { notFound } from "next/navigation";
import { TicketAdminView } from "@/components/admin/views/OpsViews";
import { emailsFor, getTicketForStaff } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.support);

export default adminRoute(async ({ d, locale, params, user }) => {
  const ticket = await getTicketForStaff((await params).id);
  if (!ticket) notFound();
  const emails = await emailsFor([ticket.owner_id, ticket.assigned_to, ...ticket.support_messages.map((m) => m.author_id)]);
  return <TicketAdminView d={d} locale={locale} ticket={ticket} emails={emails} me={user.id} />;
});
