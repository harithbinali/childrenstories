import Link from "next/link";
import { Button, Card, Icon } from "@/components/storyling";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import type { AccountSettings } from "@/lib/account/queries";
import { signOut } from "@/lib/auth/actions";
import { formatDate, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { CancelDeletionButton, DeletionForm, PasswordForm, ProfileForm } from "./SettingsForms";

/** Only plain strings may cross into client components (dictionaries also hold functions). */
const pick = <T extends object, K extends keyof T>(o: T, ...keys: K[]) => Object.fromEntries(keys.map((k) => [k, o[k]])) as Pick<T, K>;

function Section({ title, icon, tone, children }: { title: string; icon: string; tone?: "white" | "sky" | "bubble" | "paper"; children: React.ReactNode }) {
  return (
    <Card tone={tone} padding="clamp(22px,3vw,30px)" style={{ display: "grid", gap: 18, alignContent: "start" }}>
      <h2 style={{ font: "var(--type-h3)", display: "flex", gap: 10, alignItems: "center" }}><Icon name={icon} weight="duotone" />{title}</h2>
      {children}
    </Card>
  );
}

export function SettingsView({ d, locale, s }: { d: Dictionary; locale: Locale; s: AccountSettings }) {
  const t = d.settings;
  return (
    <PageBody>
      <PageHeader title={t.title} sub={t.sub} />
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit,minmax(min(360px,100%),1fr))", alignItems: "start" }}>
        <Section title={t.profileTitle} icon="user-circle">
          <div style={{ display: "grid", gap: 4 }}>
            <span className="sl-label">{t.email}</span>
            <span dir="ltr" style={{ fontWeight: 700, overflowWrap: "anywhere", justifySelf: "start" }}>{s.email}</span>
          </div>
          <ProfileForm labels={pick(t, "displayName", "displayNameHint", "language", "languageHint", "marketing", "marketingHint", "save", "saved")} errors={d.errors} initial={s} />
        </Section>

        <div style={{ display: "grid", gap: 24 }}>
          <Section title={t.passwordTitle} icon="lock-key">
            {s.usesPassword ? <PasswordForm labels={pick(t, "currentPassword", "newPassword", "newPasswordHint", "changePassword", "passwordChanged")} errors={d.errors} /> : <p style={{ color: "var(--ink-700)" }}>{t.googleOnly}</p>}
          </Section>
          <Section title={t.privacyTitle} icon="shield-check" tone="sky">
            <p style={{ color: "var(--ink-700)" }}>{t.privacyBody}</p>
            <Link href="/child-photo-privacy" style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700, width: "fit-content" }}>
              {t.privacyLink}<Icon name="arrow-right" weight="bold" />
            </Link>
          </Section>
        </div>

        <Section title={t.deleteTitle} icon="warning" tone="paper">
          {s.deletion ? (
            <>
              <p style={{ fontWeight: 700 }}>{s.deletion.status === "processing" ? t.deleteProcessing : t.deletePending(formatDate(s.deletion.scheduledFor, locale))}</p>
              {s.deletion.status === "pending" && <CancelDeletionButton label={t.deleteCancel} errors={d.errors} />}
            </>
          ) : (
            <>
              <p style={{ color: "var(--ink-700)" }}>{t.deleteBody}</p>
              <DeletionForm labels={pick(t, "deleteReason", "deleteConfirm", "deleteCta")} errors={d.errors} />
            </>
          )}
        </Section>

        <Section title={t.signOutTitle} icon="sign-out">
          <form action={signOut}><Button type="submit" variant="outline" iconStart="sign-out">{t.signOutCta}</Button></form>
        </Section>
      </div>
    </PageBody>
  );
}
