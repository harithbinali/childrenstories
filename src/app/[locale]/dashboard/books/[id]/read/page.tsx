import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { Reader } from "@/components/reader/Reader";
import { readerLabels } from "@/components/reader/labels";
import { requireUser } from "@/lib/auth/guards";
import { getReaderBook } from "@/lib/books/reader";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function Content({ locale, params }: { locale: Locale; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/dashboard/books/${id}/read`);
  const book = await getReaderBook(id);
  // Not finished, not paid for, or not theirs: back to the workspace (which 404s for strangers).
  if (!book) redirect(`/dashboard/books/${id}`);
  return <Reader book={book} labels={readerLabels(getDictionary(locale), book)} backHref={`/dashboard/books/${id}`} />;
}

/** Full-screen bedtime reader, deliberately outside the dashboard shell. */
export default async function ReadPage({ params }: PageProps<"/[locale]/dashboard/books/[id]/read">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--night-900)" }} />}>
      <Content locale={l} params={params} />
    </Suspense>
  );
}
