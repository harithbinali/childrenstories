import { Button } from "@/components/storyling";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { MobileMenu } from "./MobileMenu";
import { Wordmark } from "./Wordmark";

/** Sticky glass nav from the Storyling website kit (82% sky + 14px blur). */
export function SiteNav({ d, locale }: { d: Dictionary; locale: Locale }) {
  const links = [
    { href: "/how-it-works", label: d.nav.howItWorks },
    { href: "/themes", label: d.nav.themes },
    { href: "/examples", label: d.nav.examples },
    { href: "/pricing", label: d.nav.pricing },
    { href: "/faq", label: d.nav.faq },
  ];
  // The full link row needs ~1180px in Arabic; below that the menu button takes over.
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "14px 0", background: "rgba(238,245,255,.82)", backdropFilter: "blur(var(--blur-glass))" }}>
      <div className="sl-wrap" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Wordmark name={d.brand} />
        <nav aria-label={d.common.menu} className="hidden min-[1180px]:flex" style={{ gap: 4, marginInlineStart: 20 }}>
          {links.map((l) => (
            <a key={l.href} href={l.href} style={{ padding: "10px 12px", borderRadius: 999, whiteSpace: "nowrap", font: "600 16px/1 var(--font-display)", color: "var(--ink-800)", textDecoration: "none" }}>{l.label}</a>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <LanguageToggle locale={locale} label={d.common.language} ariaLabel={d.common.languageLabel} />
        <div className="hidden min-[1180px]:flex" style={{ gap: 8, alignItems: "center" }}>
          <Button variant="ghost" size="sm" href="/login">{d.nav.login}</Button>
          <Button size="sm" href="/register">{d.nav.start}</Button>
        </div>
        <div className="min-[1180px]:hidden">
          <MobileMenu links={links} cta={d.nav.start} ctaHref="/register" login={d.nav.login} menuLabel={d.common.menu} closeLabel={d.common.close} />
        </div>
      </div>
    </header>
  );
}
