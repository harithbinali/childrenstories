import { Badge, Checkbox, Icon, Input, Select, Switch } from "@/components/storyling";
import type { AiSettingRow, ContentRow, DiscountRow, GatewayRow, ProductRow, StyleRow, ThemeRow } from "@/lib/admin/queries";
import {
  saveAiSetting, saveDiscount, saveGateway, saveMarketingContent, saveNumericSettings, savePlatformSettings, saveProduct, saveStyle, saveTheme, setDiscountActive,
} from "@/lib/admin/actions";
import { toDecimalString } from "@/lib/payments/money";
import { formatMoney } from "@/lib/payments/pricing";
import { num, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { ActionButton, ActionForm } from "../forms";
import { AdminPage, Panel, StatusBadge, Table, when } from "../ui";

/** Collapsible editor row: summary line, form inside. */
function Editable({ summary, children, open }: { summary: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} style={{ background: "var(--white)", borderRadius: 18, boxShadow: "inset 0 0 0 2px var(--ink-100)" }}>
      <summary style={{ cursor: "pointer", padding: "14px 18px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", font: "700 15px var(--font-body)", color: "var(--ink-900)" }}>
        <Icon name="caret-down" weight="bold" />{summary}
      </summary>
      <div style={{ padding: "0 18px 18px" }}>{children}</div>
    </details>
  );
}

// ------------------------------------------------------------------ products

function ProductFields({ d, p }: { d: Dictionary; p?: ProductRow }) {
  const t = d.admin.products;
  return (
    <>
      <Input name="sku" label={t.sku} required defaultValue={p?.sku} pattern="[a-z0-9\-]+" dir="ltr" />
      <Input name="name_en" label={t.nameEn} required defaultValue={p?.name_en} dir="ltr" />
      <Input name="name_ar" label={t.nameAr} required defaultValue={p?.name_ar} dir="rtl" />
      <Select name="page_count" label={t.pageCount} defaultValue={String(p?.page_count ?? 12)} options={["8", "12", "16"]} />
      <Input name="price" label={t.price} required inputMode="decimal" dir="ltr" defaultValue={p ? toDecimalString(p.price_amount, p.currency) : ""} />
      <Input name="currency" label={t.currency} required maxLength={3} dir="ltr" defaultValue={p?.currency ?? "USD"} />
      <Input name="free_preview_pages" type="number" min={0} max={16} label={t.freePreviews} defaultValue={p?.free_preview_pages ?? 2} />
      <Input name="included_regenerations" type="number" min={0} max={100} label={t.includedRedraws} defaultValue={p?.included_regenerations ?? p?.page_count ?? 8} />
      <Input name="sort_order" type="number" min={0} max={1000} label={t.sort} defaultValue={p?.sort_order ?? 0} />
      <Checkbox name="is_active" label={d.admin.catalog.activeLabel} defaultChecked={p?.is_active ?? true} />
    </>
  );
}

export function ProductsAdminView({ d, locale, products, discounts }: { d: Dictionary; locale: Locale; products: ProductRow[]; discounts: DiscountRow[] }) {
  const t = d.admin.products;
  const c = d.admin.common;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <div style={{ display: "grid", gap: 10 }}>
        {products.map((p) => (
          <Editable key={p.id} summary={<>{locale === "ar" ? p.name_ar : p.name_en}<span style={{ color: "var(--ink-500)", fontWeight: 600 }}>· {d.common.pages(p.page_count)} · {formatMoney(p.price_amount, p.currency, locale)}</span><StatusBadge status={p.is_active ? "active" : "archived"} label={p.is_active ? c.active : c.inactive} /></>}>
            <ActionForm action={saveProduct.bind(null, p.id)} submit={c.save} saved={c.saved} errors={d.errors} columns={3}><ProductFields d={d} p={p} /></ActionForm>
          </Editable>
        ))}
        <Editable summary={<><Icon name="plus" />{t.newProduct}</>}>
          <ActionForm action={saveProduct.bind(null, null)} submit={c.create} saved={c.saved} errors={d.errors} columns={3} icon="plus" resetOnSuccess><ProductFields d={d} /></ActionForm>
        </Editable>
      </div>

      <Panel title={t.discounts}>
        <Table rowKey={(r) => r.id} rows={discounts} empty={c.empty} columns={[
          { label: t.code, cell: (r) => <b dir="ltr">{r.code}</b> },
          { label: c.amount, cell: (r) => (r.percent_off ? `${num(r.percent_off, locale)}%` : r.amount_off && r.currency ? formatMoney(r.amount_off, r.currency, locale) : "—"), nowrap: true },
          { label: t.redeemed, cell: (r) => `${num(r.redeemed_count, locale)}${r.max_redemptions ? ` / ${num(r.max_redemptions, locale)}` : ""}`, align: "end" },
          { label: t.startsAt, cell: (r) => when(r.starts_at, locale), nowrap: true },
          { label: t.expiresAt, cell: (r) => when(r.expires_at, locale), nowrap: true },
          { label: c.status, cell: (r) => <StatusBadge status={r.is_active ? "active" : "archived"} label={r.is_active ? c.active : c.inactive} /> },
          { label: c.actions, cell: (r) => <ActionButton action={setDiscountActive.bind(null, r.id, !r.is_active)} label={r.is_active ? c.disable : c.enable} icon={r.is_active ? "pause" : "play"} errors={d.errors} /> },
        ]} />
        <Editable summary={<><Icon name="plus" />{t.newDiscount}</>}>
          <ActionForm action={saveDiscount} submit={c.create} saved={c.saved} errors={d.errors} columns={3} icon="plus" resetOnSuccess>
            <Input name="code" label={t.code} required dir="ltr" pattern="[A-Za-z0-9_\-]+" />
            <Input name="percent_off" type="number" min={1} max={100} label={t.percentOff} hint={t.discountHint} />
            <Input name="amount_off" label={t.amountOff} inputMode="decimal" dir="ltr" />
            <Input name="currency" label={t.currency} maxLength={3} dir="ltr" defaultValue="USD" />
            <Input name="max_redemptions" type="number" min={1} label={t.maxRedemptions} />
            <Input name="starts_at" type="datetime-local" label={t.startsAt} />
            <Input name="expires_at" type="datetime-local" label={t.expiresAt} />
          </ActionForm>
        </Editable>
      </Panel>
    </AdminPage>
  );
}

// ------------------------------------------------------------ themes / styles

function CatalogFields({ d, row, kind }: { d: Dictionary; row?: ThemeRow | StyleRow; kind: "theme" | "style" }) {
  const t = d.admin.catalog;
  const theme = kind === "theme" ? (row as ThemeRow | undefined) : undefined;
  return (
    <>
      <Input name="slug" label={t.slug} hint={t.slugHint} required defaultValue={row?.slug} dir="ltr" pattern="[a-z0-9\-]+" />
      <Input name="sort_order" type="number" min={0} max={1000} label={t.sort} defaultValue={row?.sort_order ?? 100} />
      <Input name="name_en" label={t.nameEn} required defaultValue={row?.name_en} dir="ltr" />
      <Input name="name_ar" label={t.nameAr} required defaultValue={row?.name_ar} dir="rtl" />
      <Input name="description_en" multiline label={t.descEn} defaultValue={row?.description_en} maxLength={400} dir="ltr" />
      <Input name="description_ar" multiline label={t.descAr} defaultValue={row?.description_ar} maxLength={400} dir="rtl" />
      {kind === "theme"
        ? <Input name="prompt_guidance" multiline label={t.guidance} hint={t.promptHint} required defaultValue={theme?.prompt_guidance} maxLength={2000} dir="ltr" />
        : <Input name="prompt_template" multiline label={t.promptTemplate} hint={t.promptHint} required defaultValue={(row as StyleRow | undefined)?.prompt_template} maxLength={2000} dir="ltr" />}
      <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
        <Checkbox name="is_active" label={t.activeLabel} defaultChecked={row?.is_active ?? true} />
        {kind === "theme" && <Checkbox name="is_featured" label={t.featured} defaultChecked={theme?.is_featured} />}
        {kind === "theme" && <Checkbox name="is_custom" label={t.custom} defaultChecked={theme?.is_custom} />}
      </div>
    </>
  );
}

export function CatalogAdminView({ d, locale, rows, kind }: { d: Dictionary; locale: Locale; rows: Array<ThemeRow | StyleRow>; kind: "theme" | "style" }) {
  const c = d.admin.common;
  const title = kind === "theme" ? d.admin.nav.themes : d.admin.nav.styles;
  const save = kind === "theme" ? saveTheme : saveStyle;
  return (
    <AdminPage title={title} sub={d.admin.catalog.promptHint}>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <Editable key={r.id} summary={<>{locale === "ar" ? r.name_ar : r.name_en}<code dir="ltr" style={{ color: "var(--ink-500)", fontWeight: 600 }}>{r.slug}</code>
            <StatusBadge status={r.is_active ? "active" : "archived"} label={r.is_active ? c.active : c.inactive} />
            {"is_featured" in r && r.is_featured && <Badge size="sm" tone="sun" icon="star">{d.admin.catalog.featured}</Badge>}</>}>
            <ActionForm action={save.bind(null, r.id)} submit={c.save} saved={c.saved} errors={d.errors} columns={2}><CatalogFields d={d} row={r} kind={kind} /></ActionForm>
          </Editable>
        ))}
        <Editable summary={<><Icon name="plus" />{kind === "theme" ? d.admin.catalog.newTheme : d.admin.catalog.newStyle}</>}>
          <ActionForm action={save.bind(null, null)} submit={c.create} saved={c.saved} errors={d.errors} columns={2} icon="plus" resetOnSuccess><CatalogFields d={d} kind={kind} /></ActionForm>
        </Editable>
      </div>
    </AdminPage>
  );
}

// ------------------------------------------------------------------------ AI

const QUALITIES = [{ value: "low", label: "low" }, { value: "medium", label: "medium" }, { value: "high", label: "high" }];

export function AiAdminView({ d, settings, numbers, keyConfigured }: { d: Dictionary; settings: AiSettingRow[]; numbers: Record<string, unknown>; keyConfigured: boolean }) {
  const t = d.admin.ai;
  const c = d.admin.common;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Panel tone={keyConfigured ? "mint" : "sun"} pad={14}>
        <p style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}><Icon name={keyConfigured ? "check-circle" : "warning"} />{t.keyStatus}: {keyConfigured ? c.configured : c.notConfigured}</p>
      </Panel>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(440px,100%),1fr))", alignItems: "start" }}>
        {settings.map((s) => (
          <Panel key={s.purpose} title={t.purpose[s.purpose] ?? s.purpose}>
            <ActionForm action={saveAiSetting.bind(null, s.purpose)} submit={c.save} saved={c.saved} errors={d.errors} columns={2}>
              <Input name="model" label={t.model} required defaultValue={s.model} dir="ltr" />
              <Input name="timeout_s" type="number" min={5} max={900} label={t.timeout} defaultValue={Math.round(s.timeout_ms / 1000)} />
              <Input name="max_retries" type="number" min={0} max={5} label={t.retries} defaultValue={s.max_retries} />
              {(s.purpose === "story" || s.purpose === "story_fast") && (
                <Select name="reasoning_effort" label={t.reasoning} defaultValue={String(s.params.reasoning_effort ?? "")} options={[{ value: "", label: c.none }, ...["minimal", "low", "medium", "high"].map((v) => ({ value: v, label: v }))]} />
              )}
              {s.purpose === "image" && (
                <>
                  <Select name="preview_quality" label={t.previewQuality} defaultValue={String(s.params.preview_quality ?? "medium")} options={QUALITIES} />
                  <Select name="final_quality" label={t.finalQuality} defaultValue={String(s.params.final_quality ?? "high")} options={QUALITIES} />
                  <Input name="portrait_size" label={t.portraitSize} hint={t.sizeHint} dir="ltr" defaultValue={String(s.params.portrait_size ?? "1024x1536")} pattern="\d{3,4}x\d{3,4}" />
                  <Input name="landscape_size" label={t.landscapeSize} dir="ltr" defaultValue={String(s.params.landscape_size ?? "1536x1024")} pattern="\d{3,4}x\d{3,4}" />
                </>
              )}
              <Input name="pricing" multiline label={t.pricing} hint={t.pricingHint} dir="ltr" defaultValue={JSON.stringify(s.pricing ?? {}, null, 1)} style={{ gridColumn: "1 / -1" }} />
            </ActionForm>
          </Panel>
        ))}
        <Panel title={t.platformTitle}>
          <ActionForm action={saveNumericSettings.bind(null, "/ai")} submit={c.save} saved={c.saved} errors={d.errors}>
            <Input name="limits.worker_concurrency" type="number" min={1} max={32} label={t.concurrency} defaultValue={Number(numbers["limits.worker_concurrency"] ?? 3)} />
            <Input name="limits.daily_platform_spend_usd" type="number" min={0} step="0.01" label={t.spend} hint={t.spendHint} defaultValue={Number(numbers["limits.daily_platform_spend_usd"] ?? 100)} />
          </ActionForm>
        </Panel>
      </div>
    </AdminPage>
  );
}

// -------------------------------------------------------------------- limits

export const LIMIT_KEYS = ["limits.free_character_attempts", "limits.free_story_attempts", "limits.free_illustration_previews", "limits.daily_image_generations_per_user", "limits.daily_text_generations_per_user", "limits.max_concurrent_jobs_per_user"];

export function LimitsAdminView({ d, values }: { d: Dictionary; values: Record<string, unknown> }) {
  const t = d.admin.limits;
  const c = d.admin.common;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Panel>
        <ActionForm action={saveNumericSettings.bind(null, "/limits")} submit={c.save} saved={c.saved} errors={d.errors} columns={2}>
          {LIMIT_KEYS.map((k) => <Input key={k} name={k} type="number" min={0} max={1000} label={t.keys[k]} defaultValue={Number(values[k] ?? 0)} />)}
        </ActionForm>
      </Panel>
      <p style={{ font: "var(--type-small)", color: "var(--ink-500)" }}>{t.perProduct} {d.admin.ai.spendHint}</p>
    </AdminPage>
  );
}

// ------------------------------------------------------------------ gateways

export function GatewaysAdminView({ d, gateways, configured }: { d: Dictionary; gateways: GatewayRow[]; configured: Record<string, boolean> }) {
  const t = d.admin.gateways;
  const c = d.admin.common;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(400px,100%),1fr))", alignItems: "start" }}>
        {gateways.map((g) => (
          <Panel key={g.gateway} title={g.gateway === "stripe" ? "Stripe" : "PayPal"} actions={<StatusBadge status={g.is_enabled ? "active" : "archived"} label={g.is_enabled ? c.enabled : c.disabled} />}>
            <p style={{ display: "flex", gap: 8, alignItems: "center", font: "700 14px var(--font-body)", color: configured[g.gateway] ? "var(--mint-600)" : "var(--tangerine-600)" }}>
              <Icon name={configured[g.gateway] ? "check-circle" : "warning"} />{t.credentials}: {configured[g.gateway] ? c.configured : c.notConfigured}
            </p>
            <p style={{ font: "var(--type-small)", color: "var(--ink-700)" }}>{t.mode}: <b>{g.mode === "live" ? t.live : t.sandbox}</b> · {t.modeHint}</p>
            {!configured[g.gateway] && <p style={{ font: "var(--type-small)", color: "var(--ink-700)" }}>{t.cantEnable}</p>}
            <ActionForm action={saveGateway.bind(null, g.gateway)} submit={c.save} saved={c.saved} errors={d.errors}>
              <Switch name="is_enabled" label={t.enable} icon="credit-card" defaultChecked={g.is_enabled} disabled={!configured[g.gateway] && !g.is_enabled} />
              <Checkbox name="is_default" label={t.default} defaultChecked={g.is_default} />
              <Input name="supported_currencies" label={t.currencies} hint={t.currenciesHint} dir="ltr" defaultValue={g.supported_currencies.join(", ")} />
            </ActionForm>
            <a href={`/admin/payments?type=${g.gateway}`} style={{ fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center" }}><Icon name="list" />{t.transactions}</a>
          </Panel>
        ))}
      </div>
    </AdminPage>
  );
}

// ------------------------------------------------------------------- content

type Hero = Partial<Record<"eyebrow" | "h1a" | "h1b" | "h1c" | "sub" | "cta", string>>;

export function ContentAdminView({ d, rows, locale: uiLocale }: { d: Dictionary; rows: ContentRow[]; locale: Locale }) {
  const t = d.admin.content;
  const c = d.admin.common;
  const get = <T,>(key: string, l: string) => rows.find((r) => r.key === key && r.locale === l)?.content as T | undefined;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <p style={{ font: "var(--type-small)", color: "var(--ink-500)" }}>{t.featuredNote}</p>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(520px,100%),1fr))", alignItems: "start" }}>
        {(["en", "ar"] as const).map((l) => {
          const hero = get<Hero>("home.hero", l) ?? {};
          const pricing = get<{ title?: string; sub?: string }>("home.pricing", l) ?? {};
          const faqs = get<Array<{ q: string; a: string }>>("home.faqs", l) ?? [];
          const banner = get<{ text?: string; href?: string; enabled?: boolean }>("site.banner", l) ?? {};
          const contact = get<{ email?: string; address?: string }>("site.contact", l) ?? {};
          const dir = l === "ar" ? "rtl" : "ltr";
          const h = getDictionary(l).home; // built-in copy, shown as placeholders
          return (
            <Panel key={l} title={`${t.locale}: ${l === "ar" ? "العربية" : "English"}`} actions={uiLocale !== l ? <Badge size="sm" tone="ink">{l}</Badge> : undefined}>
              <ActionForm action={saveMarketingContent.bind(null, l)} submit={c.save} saved={c.saved} errors={d.errors}>
                <h3 style={{ font: "var(--type-h4)" }}>{t.hero}</h3>
                <div dir={dir} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))" }}>
                  <Input name="hero.eyebrow" placeholder={h.eyebrow} label={t.eyebrow} defaultValue={hero.eyebrow} maxLength={80} />
                  <Input name="hero.cta" placeholder={h.cta} label={t.heroCta} defaultValue={hero.cta} maxLength={40} />
                  <Input name="hero.h1a" placeholder={h.h1a} label={t.h1a} defaultValue={hero.h1a} maxLength={60} />
                  <Input name="hero.h1b" placeholder={h.h1b} label={t.h1b} defaultValue={hero.h1b} maxLength={60} />
                  <Input name="hero.h1c" placeholder={h.h1c} label={t.h1c} defaultValue={hero.h1c} maxLength={60} />
                </div>
                <Input dir={dir} name="hero.sub" placeholder={h.sub} multiline label={t.heroSub} defaultValue={hero.sub} maxLength={300} />
                <h3 style={{ font: "var(--type-h4)" }}>{t.pricing}</h3>
                <Input dir={dir} name="pricing.title" placeholder={h.pricingTitle} label={t.pricingTitle} defaultValue={pricing.title} maxLength={80} />
                <Input dir={dir} name="pricing.sub" placeholder={h.pricingSub} multiline label={t.pricingSub} defaultValue={pricing.sub} maxLength={300} />
                <h3 style={{ font: "var(--type-h4)" }}>{t.faqs}</h3>
                <Input dir={dir} name="faqs" multiline label={t.faqs} hint={t.faqsHint} rows={8} placeholder={h.faqs.slice(0, 2).map((f) => `${f.q}\n${f.a}`).join("\n\n")} defaultValue={faqs.map((f) => `${f.q}\n${f.a}`).join("\n\n")} />
                <h3 style={{ font: "var(--type-h4)" }}>{t.banner}</h3>
                <Input dir={dir} name="banner.text" label={t.bannerText} defaultValue={banner.text} maxLength={160} />
                <Input name="banner.href" label={t.bannerHref} defaultValue={banner.href} dir="ltr" placeholder="/pricing" />
                <Checkbox name="banner.enabled" label={t.bannerOn} defaultChecked={banner.enabled} />
                <h3 style={{ font: "var(--type-h4)" }}>{t.contact}</h3>
                <Input name="contact.email" type="email" label={t.contactEmail} defaultValue={contact.email} dir="ltr" />
                <Input dir={dir} name="contact.address" multiline label={t.contactAddress} defaultValue={contact.address} maxLength={300} />
              </ActionForm>
            </Panel>
          );
        })}
      </div>
    </AdminPage>
  );
}

// ------------------------------------------------------------------ settings

export function SettingsAdminView({ d, values }: { d: Dictionary; values: Record<string, unknown> }) {
  const t = d.admin.settings;
  const c = d.admin.common;
  return (
    <AdminPage title={t.title} sub={t.sub}>
      <Panel>
        <ActionForm action={savePlatformSettings} submit={c.save} saved={c.saved} errors={d.errors} columns={2}>
          <Input name="brand.name" label={t.brandName} hint={t.brandHint} required maxLength={40} defaultValue={String(values["brand.name"] ?? "Storyling")} />
          <Input name="brand.support_email" type="email" label={t.supportEmail} required dir="ltr" defaultValue={String(values["brand.support_email"] ?? "")} />
          <Input name="retention.child_photo_days" type="number" min={0} max={365} label={t.retention} hint={t.retentionHint} defaultValue={Number(values["retention.child_photo_days"] ?? 30)} />
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <span className="sl-label">{t.featuresTitle}</span>
            <Switch name="features.google_auth" label={t.googleAuth} icon="google-logo" defaultChecked={values["features.google_auth"] === true} />
            <span className="sl-hint">{t.googleHint}</span>
            <Switch name="features.design_system_public" label={t.designSystemPublic} icon="palette" defaultChecked={values["features.design_system_public"] === true} />
          </div>
        </ActionForm>
      </Panel>
    </AdminPage>
  );
}
