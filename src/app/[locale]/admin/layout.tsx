import { Suspense } from "react";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const metadata = { title: { template: "%s · Admin", default: "Admin" }, robots: { index: false, follow: false } };

async function Frame({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // Non-staff get a 404: the admin area doesn't reveal that it exists.
  const user = await requireStaff();
  return <AdminFrame d={getDictionary(locale)} locale={locale} isAdmin={isAdmin(user)} name={user.displayName} email={user.email}>{children}</AdminFrame>;
}

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--paper)" }} />}><Frame locale={l}>{children}</Frame></Suspense>;
}
