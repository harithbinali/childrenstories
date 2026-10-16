import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Badge, Card, Icon, type BadgeTone } from "@/components/storyling";
import { formatDate, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Admin building blocks: Storyling colours and type, tuned for density —
 * no decor, flat cards, compact tables (brief 3.11).
 */
export function AdminPage({ title, sub, actions, back, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: { href: string; label: string }; children: ReactNode }) {
  return (
    <div style={{ padding: "clamp(16px,3vw,32px)", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1440, minWidth: 0 }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          {back && <Link href={back.href} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "700 14px var(--font-body)", width: "fit-content" }}><Icon name="arrow-left" weight="bold" />{back.label}</Link>}
          <h1 style={{ font: "var(--type-h2)", overflowWrap: "anywhere" }}>{title}</h1>
          {sub && <p style={{ color: "var(--ink-700)", font: "var(--type-small)", maxWidth: 720 }}>{sub}</p>}
        </div>
        {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Panel({ title, actions, children, tone, pad = 20 }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; tone?: "white" | "paper" | "sky" | "sun" | "mint" | "cherry"; pad?: number }) {
  return (
    <Card tone={tone} variant="flat" padding={pad} style={{ display: "grid", gap: 14, alignContent: "start", minWidth: 0, boxShadow: "inset 0 0 0 2px var(--ink-100)" }}>
      {(title || actions) && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          {title && <h2 style={{ font: "var(--type-h4)" }}>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </Card>
  );
}

export function Stat({ label, value, hint, icon, tone = "sky", href }: { label: string; value: ReactNode; hint?: ReactNode; icon: string; tone?: "sky" | "sun" | "mint" | "bubble" | "grape" | "cherry" | "tangerine"; href?: string }) {
  const body = (
    <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 22, background: "var(--white)", boxShadow: "inset 0 0 0 2px var(--ink-100)", height: "100%" }}>
      <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: `var(--tint-${tone === "cherry" ? "bubble" : tone})`, display: "grid", placeItems: "center", flex: "none" }}>
        <Icon name={icon} weight="duotone" size={24} color={tone === "cherry" ? "var(--cherry-600)" : "var(--ink-900)"} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>{label}</div>
        <div style={{ font: "700 24px/1.15 var(--font-display)", color: "var(--ink-900)", overflowWrap: "anywhere" }}>{value}</div>
        {hint && <div style={{ font: "var(--type-caption)", color: "var(--ink-500)" }}>{hint}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit", fontWeight: "inherit" }}>{body}</Link> : body;
}

export const StatGrid = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,100%),1fr))" }}>{children}</div>
);

export type Column<T> = { label: string; cell: (row: T) => ReactNode; align?: "start" | "end"; width?: number | string; nowrap?: boolean; minWidth?: number };

/** Dense, horizontally scrollable table (the page itself never scrolls sideways). */
export function Table<T>({ columns, rows, empty, rowKey }: { columns: Column<T>[]; rows: T[]; empty: string; rowKey: (r: T) => string }) {
  if (!rows.length) return <p style={{ padding: 20, color: "var(--ink-500)", background: "var(--white)", borderRadius: 18, boxShadow: "inset 0 0 0 2px var(--ink-100)" }}>{empty}</p>;
  return (
    <div style={{ overflowX: "auto", background: "var(--white)", borderRadius: 18, boxShadow: "inset 0 0 0 2px var(--ink-100)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--type-small)" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" style={{ textAlign: c.align ?? "start", padding: "12px 14px", font: "800 12px/1.2 var(--font-body)", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-500)", borderBottom: "2px solid var(--ink-100)", whiteSpace: "nowrap", width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r)} style={{ background: i % 2 ? "var(--paper)" : undefined }}>
              {columns.map((c) => (
                <td key={c.label} style={{ textAlign: c.align ?? "start", padding: "10px 14px", verticalAlign: "top", color: "var(--ink-800)", whiteSpace: c.nowrap ? "nowrap" : undefined, minWidth: c.minWidth, borderBottom: "1px solid var(--ink-100)" }}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Params = Record<string, string | undefined>;
const qs = (p: Params) => { const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString(); return s ? `?${s}` : ""; };

/** GET search/filter form: shareable URLs, works without JavaScript. */
export function Toolbar({ d, params, search = true, filters = [], placeholder }: {
  d: Dictionary; params: Params; search?: boolean; placeholder?: string;
  filters?: Array<{ name: string; label: string; options: Array<{ value: string; label: string }> }>;
}) {
  const t = d.admin.common;
  return (
    <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      {search && (
        <label className="sl-field" style={{ flex: "1 1 240px", minWidth: 0 }}>
          <span className="sl-label">{t.search}</span>
          <span className="sl-control"><Icon name="magnifying-glass" /><input name="q" type="search" defaultValue={params.q} placeholder={placeholder ?? t.searchPlaceholder} /></span>
        </label>
      )}
      {filters.map((f) => (
        <label key={f.name} className="sl-field" style={{ flex: "0 1 200px" }}>
          <span className="sl-label">{f.label}</span>
          <span className="sl-control">
            <select name={f.name} defaultValue={params[f.name] ?? ""}>
              <option value="">{t.all}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Icon name="caret-down" weight="bold" style={{ color: "var(--ink-500)", pointerEvents: "none" }} />
          </span>
        </label>
      ))}
      <button type="submit" className="sl-btn sl-btn--secondary sl-btn--sm"><Icon name="funnel" />{t.filter}</button>
    </form>
  );
}

export function Pager({ d, page, pages, total, params }: { d: Dictionary; page: number; pages: number; total: number; params: Params }) {
  const t = d.admin.common;
  return (
    <nav aria-label={t.page(page, pages)} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", font: "var(--type-small)", color: "var(--ink-500)" }}>
      <span>{t.results(total)} · {t.page(page, pages)}</span>
      <span style={{ display: "flex", gap: 8 }}>
        {page > 1 && <Link className="sl-btn sl-btn--outline sl-btn--sm" href={qs({ ...params, page: String(page - 1) })}><Icon name="arrow-left" />{t.prev}</Link>}
        {page < pages && <Link className="sl-btn sl-btn--outline sl-btn--sm" href={qs({ ...params, page: String(page + 1) })}>{t.next}<Icon name="arrow-right" /></Link>}
      </span>
    </nav>
  );
}

const TONES: Record<string, BadgeTone> = {
  active: "mint", completed: "mint", paid: "mint", succeeded: "mint", approved: "mint", resolved: "mint", ready: "mint",
  processing: "sky", queued: "sky", generating: "sky", story_generating: "sky", illustrating: "sky", producing: "sky", open: "sky", awaiting_staff: "sky",
  pending: "sun", awaiting_customer: "sun", preview_ready: "sun", story_ready: "sun", story_approved: "sun", draft: "ink",
  failed: "cherry", suspended: "cherry", urgent: "cherry", rejected: "cherry", deletion_requested: "cherry",
  refunded: "grape", partially_refunded: "grape", cancelled: "ink", closed: "ink", archived: "ink", high: "tangerine",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge size="sm" variant="soft" tone={TONES[status] ?? "ink"}>{label ?? status.replace(/_/g, " ")}</Badge>;
}

export const Mono = ({ children }: { children: ReactNode }) => <code dir="ltr" style={{ font: "600 12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--ink-700)", overflowWrap: "anywhere" }}>{children}</code>;
export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : "—");
export const when = (iso: string | null | undefined, l: Locale) => (iso ? formatDate(iso, l, true) : "—");
/** USD amounts from AI cost logs. Totals use cents; per-book costs can show `digits` = 4. */
export const usd = (n: number | string | null | undefined, l: Locale, digits = 2) =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat(l === "ar" ? "ar-u-nu-arab" : "en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: digits }).format(Number(n));

export function KeyValues({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "minmax(120px, max-content) 1fr", gap: "8px 18px", margin: 0, font: "var(--type-small)" }}>
      {items.map(([k, v]) => (
        <Fragment key={k}><dt style={{ color: "var(--ink-500)", fontWeight: 700 }}>{k}</dt><dd style={{ margin: 0, color: "var(--ink-900)", minWidth: 0, overflowWrap: "anywhere" }}>{v}</dd></Fragment>
      ))}
    </dl>
  );
}

/** Reads ?q=&status=&type=&page= from page props. */
export async function listParams(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string).slice(0, 120) : undefined);
  const page = Number(s("page") ?? 1);
  return { q: s("q"), status: s("status"), type: s("type"), page: Number.isInteger(page) && page > 0 ? page : 1, raw: { q: s("q"), status: s("status"), type: s("type") } };
}
