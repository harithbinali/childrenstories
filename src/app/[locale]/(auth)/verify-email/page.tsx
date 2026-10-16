import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { VerifyEmailPanel } from "@/components/auth/AuthForms";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  return isLocale(l) ? { title: getDictionary(l).auth.verifyTitle, robots: { index: false } } : {};
}

export default async function Page() {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const a = getDictionary(l).auth;
  return (
    <Suspense fallback={null}>
      <VerifyEmailPanel a={a} />
    </Suspense>
  );
}
