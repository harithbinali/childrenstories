import { Suspense } from "react";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { BookWorkspaceView } from "@/components/book-workspace/BookWorkspaceView";
import { requireUser } from "@/lib/auth/guards";
import { getBookWorkspace } from "@/lib/books/queries";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

async function Content({ locale, params, searchParams }: { locale: Locale; params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireUser(`/dashboard/books/${id}`);
  const b = await getBookWorkspace(id);
  if (!b) notFound();
  return <BookWorkspaceView d={getDictionary(locale)} locale={locale} b={b} payment={typeof sp.payment === "string" ? sp.payment : undefined} />;
}

export default async function BookPage({ params, searchParams }: PageProps<"/[locale]/dashboard/books/[id]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} params={params} searchParams={searchParams} /></Suspense>;
}
