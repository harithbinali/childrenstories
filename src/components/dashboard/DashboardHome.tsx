import Link from "next/link";
import { Avatar, AVATAR_TONES, BlobFrame, Button, Card, FloatingDecor, Icon } from "@/components/storyling";
import type { Overview } from "@/lib/dashboard/overview";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Bookshelf, type ShelfBook } from "./Bookshelf";
import { Greeting } from "./Greeting";

const COVER_TONES = ["sky", "bubble", "mint", "grape", "tangerine", "sun"] as const;

/** Parent dashboard home — a pure view of the overview data (also used by the design preview). */
export function DashboardHome({ d, locale, data }: { d: Dictionary; locale: Locale; data: Overview }) {
  const t = d.dashboard;
  const first = data.children[0];
  const ages: Record<string, string> = { "0-2": "0–2", "3-5": "3–5", "6-8": "6–8", "9-12": "9–12" };
  const books: ShelfBook[] = data.books.map((b, i) => ({
    id: b.id, title: b.title ?? t.untitled, childId: b.childId, coverUrl: b.coverUrl, isFavorite: b.isFavorite,
    pagesLabel: d.common.pages(b.pageCount), ageLabel: num(ages[b.ageRange] ?? b.ageRange, locale),
    tone: COVER_TONES[i % COVER_TONES.length],
    ...(b.status === "completed"
      ? b.progress === 100 ? { badge: t.finished, badgeTone: "mint" as const, progress: 100 } : { badge: b.progress ? undefined : t.new, progress: b.progress ?? 0 }
      : { badge: t.status[b.status] ?? b.status, badgeTone: b.status === "failed" ? ("cherry" as const) : ("sky" as const) }),
  }));
  const stats = [
    { icon: "user-circle", value: data.stats.characters, label: t.stats.characters, tone: "grape" },
    { icon: "books", value: data.stats.books, label: t.stats.books, tone: "sky" },
    { icon: "seal-check", value: data.stats.purchased, label: t.stats.purchased, tone: "mint" },
    { icon: "hourglass-medium", value: data.stats.inProgress, label: t.stats.inProgress, tone: "sun" },
  ];

  return (
    <div style={{ padding: "clamp(20px,4vw,44px)", display: "flex", flexDirection: "column", gap: 36, maxWidth: 1180 }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="sl-eyebrow">{d.brand}</div>
          <h1 style={{ font: "var(--type-h2)", marginTop: 6 }}>
            <Greeting labels={t.greeting} name={data.displayName} /> <Icon name="moon-stars" color="var(--sun-400)" />
          </h1>
        </div>
        <nav aria-label={t.yourChildren} style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          {data.children.map((c, i) => (
            <Link key={c.id} href={`/dashboard/children/${c.id}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, font: "700 13px var(--font-body)", color: "var(--ink-700)", textDecoration: "none" }}>
              <Avatar name={c.name} tone={AVATAR_TONES[i % AVATAR_TONES.length]} size={52} active={i === 0} />
              {c.name}
            </Link>
          ))}
          <Link href="/dashboard/children?new=1" aria-label={t.addChild} title={t.addChild}
            style={{ width: 52, height: 52, borderRadius: "50%", border: "3px dashed var(--ink-200)", display: "grid", placeItems: "center", color: "var(--ink-400)", fontSize: 22 }}>
            <Icon name="plus" weight="bold" />
          </Link>
        </nav>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 24 }}>
        {first ? (
          <Card tone="sun" wobble padding={32} className="wide:col-span-2" style={{ overflow: "hidden", minHeight: 230, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            <FloatingDecor preset="magicEdge" />
            <h2 style={{ font: "var(--type-h2)", position: "relative", maxWidth: 460 }}>{t.makeStoryFor(first.name)}</h2>
            <p style={{ position: "relative", color: "var(--ink-800)", maxWidth: 440 }}>{t.makeStorySub}</p>
            <div style={{ position: "relative", marginTop: 6 }}><Button variant="secondary" size="lg" iconStart="magic-wand" href="/dashboard/create">{t.createCta}</Button></div>
          </Card>
        ) : (
          <Card tone="sun" wobble padding={32} className="wide:col-span-2" style={{ overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,180px)", gap: 20, alignItems: "center" }}>
            <FloatingDecor preset="magicEdge" />
            <div style={{ position: "relative", display: "grid", gap: 14 }}>
              <h2 style={{ font: "var(--type-h2)" }}>{t.emptyChildrenTitle}</h2>
              <p style={{ color: "var(--ink-800)" }}>{t.emptyChildrenBody}</p>
              <div><Button variant="secondary" size="lg" iconStart="user-circle-plus" href="/dashboard/children?new=1">{t.addChild}</Button></div>
            </div>
            <BlobFrame shape={1} tone="bubble" icon="baby" label="" style={{ position: "relative" }} />
          </Card>
        )}
        <Card padding={26} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "start" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: `var(--tint-${s.tone})`, borderRadius: 20, padding: 14 }}>
              <Icon name={s.icon} size={22} color="var(--ink-800)" />
              <div style={{ font: "700 26px/1.1 var(--font-display)", color: "var(--ink-900)", marginTop: 6 }}>{num(s.value, locale)}</div>
              <div style={{ font: "var(--type-caption)", color: "var(--ink-700)" }}>{s.label}</div>
            </div>
          ))}
        </Card>
      </div>

      <Bookshelf
        books={books}
        kids={data.children.map((c) => ({ id: c.id, name: c.name, shelfTitle: t.bookshelf(c.name) }))}
        labels={{ all: d.nav.dashboard, allTitle: t.allBooks, recent: t.tabs.recent, favorites: t.tabs.favorites, emptyTitle: t.emptyShelfTitle, emptyBody: t.emptyShelfBody, filter: t.yourChildren }}
      />

      <section aria-labelledby="activity-title" style={{ display: "grid", gap: 16 }}>
        <h2 id="activity-title" style={{ font: "var(--type-h3)" }}>{t.recentActivity}</h2>
        {data.activity.length === 0 ? (
          <p style={{ color: "var(--ink-500)", display: "flex", gap: 8, alignItems: "center" }}><Icon name="check-circle" color="var(--mint-500)" />{t.noActivity}</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {data.activity.map((a) => {
              const tone = a.status === "completed" ? "mint" : a.status === "failed" ? "cherry" : "sky";
              return (
                <li key={a.id} style={{ display: "flex", gap: 14, alignItems: "center", background: "var(--white)", borderRadius: 20, padding: "12px 16px", boxShadow: "var(--shadow-xs)" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", background: `var(--${tone}-100)`, color: `var(--${tone}-600)`, flex: "none" }}>
                    <Icon name={a.status === "completed" ? "check-circle" : a.status === "failed" ? "warning-circle" : "hourglass-medium"} size={22} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "700 15px var(--font-body)", color: "var(--ink-900)" }}>{t.activityTypes[a.type] ?? a.type}</div>
                    {a.bookTitle && <div style={{ font: "var(--type-small)", color: "var(--ink-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.bookTitle}</div>}
                  </div>
                  <span style={{ font: "700 13px var(--font-body)", color: `var(--${tone}-600)` }}>{t.jobStatus[a.status] ?? a.status}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
