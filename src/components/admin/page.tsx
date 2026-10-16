import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { isAdmin, requireAdmin, requireStaff, type SessionUser } from "@/lib/auth/guards";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";

type SP = Promise<Record<string, string | string[] | undefined>>;
export type AdminCtx = { d: Dictionary; locale: Locale; user: SessionUser; isAdmin: boolean; searchParams: SP; params: Promise<Record<string, string>> };

/**
 * Builds an admin route: role check (404 for anyone else), dictionary, and a
 * Suspense boundary around the data-loading body (Cache Components).
 */
export function adminRoute(render: (ctx: AdminCtx) => Promise<ReactNode>, opts: { admin?: boolean } = {}) {
  async function Body({ locale, searchParams, params }: { locale: Locale; searchParams: SP; params: Promise<Record<string, string>> }) {
    const user = opts.admin ? await requireAdmin() : await requireStaff();
    return render({ d: getDictionary(locale), locale, user, isAdmin: isAdmin(user), searchParams, params });
  }
  return async function AdminRoute(props: { searchParams?: SP; params?: Promise<Record<string, string>> }) {
    const l = await localeParam();
    if (!isLocale(l)) notFound();
    return (
      <Suspense fallback={<p style={{ padding: 32 }}>{getDictionary(l).common.loading}</p>}>
        <Body locale={l} searchParams={props.searchParams ?? Promise.resolve({})} params={props.params ?? Promise.resolve({})} />
      </Suspense>
    );
  };
}

export function adminMetadata(title: (d: Dictionary) => string) {
  return async (): Promise<Metadata> => {
    const l = await localeParam();
    return isLocale(l) ? { title: title(getDictionary(l)) } : {};
  };
}
