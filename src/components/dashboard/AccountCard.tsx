import { Avatar, Icon } from "@/components/storyling";
import { LanguageToggle } from "@/components/LanguageToggle";
import { signOut } from "@/lib/auth/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export function AccountCard({ d, locale, name, email }: { d: Dictionary; locale: Locale; name: string | null; email: string | null }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <LanguageToggle locale={locale} label={d.common.language} ariaLabel={d.common.languageLabel} style={{ justifySelf: "start", boxShadow: "none", background: "transparent" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#fff", borderRadius: 22 }}>
        <Avatar name={name ?? email ?? "?"} tone="grape" size={40} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ color: "var(--ink-900)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name ?? email}</b>
          {name && email && <span dir="ltr" style={{ font: "var(--type-caption)", color: "var(--ink-500)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>}
        </div>
        <form action={signOut}>
          <button type="submit" aria-label={d.dashboard.nav.logout} title={d.dashboard.nav.logout} className="sl-btn sl-btn--ghost sl-btn--icon sl-btn--sm">
            <Icon name="sign-out" weight="bold" />
          </button>
        </form>
      </div>
    </div>
  );
}
