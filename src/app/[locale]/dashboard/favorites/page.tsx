import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { BooksListView } from "@/components/book-workspace/BooksListView";
import { requireUser } from "@/lib/auth/guards";
import { listBooks } from "@/lib/books/queries";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).books.favorites } : {};
}

async function Content({ locale }: { locale: Locale }) {
  await requireUser("/dashboard/favorites");
  const d = getDictionary(locale);
  return <BooksListView d={d} locale={locale} books={await listBooks("favorites")} title={d.books.favorites} sub={d.books.favoritesSub} />;
}

export default async function Page() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={<p style={{ padding: 44 }}>{getDictionary(l).common.loading}</p>}><Content locale={l} /></Suspense>;
}
