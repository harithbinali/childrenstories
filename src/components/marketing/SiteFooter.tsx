import Link from "next/link";
import { cacheLife } from "next/cache";
import { Button, FloatingDecor, WaveDivider } from "@/components/storyling";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Copyright year, cached for a day (Cache Components disallow raw Date() during prerender). */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter({ d, locale }: { d: Dictionary; locale: Locale }) {
  const year = await currentYear();
  const links = [
    ["/about", d.footer.about], ["/contact", d.footer.contact], ["/privacy", d.footer.privacy], ["/child-photo-privacy", d.footer.photoPrivacy],
    ["/terms", d.footer.terms], ["/refund-policy", d.footer.refunds],
  ];
  return (
    <footer>
      <WaveDivider color="var(--night-900)" variant="drip" height={70} />
      <div style={{ background: "var(--night-900)", color: "var(--ink-200)", position: "relative", padding: "40px 0 36px" }}>
        {/* Decor stays in the top band, clear of the wordmark, tagline and links. */}
        <FloatingDecor items={[
          { icon: "moon-stars", color: "var(--sun-400)", size: 34, top: "3%", end: "3%", anim: "float" },
          { icon: "star", color: "var(--sun-200)", size: 12, top: "4%", start: "38%", anim: "twinkle" },
          { icon: "sparkle", color: "var(--grape-400)", size: 16, top: "2%", end: "28%", anim: "twinkle", delay: 1.1 },
        ]} />
        <div className="sl-wrap" style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 30, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ font: "700 36px/1 var(--font-display)", color: "#fff" }}>{d.brand}</div>
            <p style={{ marginTop: 10, color: "var(--ink-300)" }}>{d.footer.tagline}</p>
          </div>
          <Button iconStart="magic-wand" href="/register">{d.nav.start}</Button>
        </div>
        <div className="sl-wrap" style={{ position: "relative", marginTop: 36, paddingTop: 20, borderTop: "2px dashed var(--night-700)", display: "flex", gap: 22, flexWrap: "wrap", font: "600 14px var(--font-body)", color: "var(--ink-300)" }}>
          <span>© {num(year, locale)} {d.brand}. {d.footer.rights}</span>
          {links.map(([href, label]) => (
            <Link key={href} href={href} style={{ color: "var(--ink-200)", fontWeight: 600 }}>{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
