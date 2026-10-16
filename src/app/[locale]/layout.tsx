import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { LOCALES, dirOf, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fontVariables } from "./fonts";
// Storyling iconography: Phosphor fill / bold / duotone (self-hosted, see design/storyling/readme.md)
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/bold";
import "@phosphor-icons/web/duotone";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const l = await localeParam();
  if (!isLocale(l)) return {};
  const d = getDictionary(l);
  return {
    title: { default: `${d.brand} — ${d.home.h1a} ${d.home.h1b} ${d.home.h1c}`, template: `%s · ${d.brand}` },
    description: d.home.sub,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  };
}

export const viewport: Viewport = { themeColor: "#2F7DF0", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return (
    <html lang={l} dir={dirOf(l)} className={fontVariables}>
      <body>
        <a href="#main" className="sl-visually-hidden" style={{ position: "absolute" }}>{getDictionary(l).common.skipToContent}</a>
        {children}
      </body>
    </html>
  );
}
