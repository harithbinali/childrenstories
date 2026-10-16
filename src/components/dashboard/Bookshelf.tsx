"use client";
import { useState } from "react";
import { Avatar, AVATAR_TONES, Card, Icon, StoryCard, Tabs, BlobFrame } from "@/components/storyling";

export type ShelfBook = {
  id: string; title: string; childId: string | null; coverUrl: string | null; isFavorite: boolean;
  pagesLabel: string; ageLabel: string; badge?: string; badgeTone?: "sun" | "mint" | "sky" | "grape" | "cherry"; progress?: number;
  tone: "sun" | "sky" | "bubble" | "mint" | "grape" | "tangerine" | "night";
};
export type ShelfChild = { id: string; name: string; shelfTitle: string };

/** Bookshelf with a child filter and recent/favourites tabs (Storyling app kit). */
export function Bookshelf({ books, kids, labels }: {
  books: ShelfBook[]; kids: ShelfChild[];
  labels: { all: string; allTitle: string; recent: string; favorites: string; emptyTitle: string; emptyBody: string; filter: string };
}) {
  const [kid, setKid] = useState<string>("all");
  const [tab, setTab] = useState("recent");
  const shown = books.filter((b) => (kid === "all" || b.childId === kid) && (tab === "recent" || b.isFavorite));
  const title = kid === "all" ? labels.allTitle : kids.find((k) => k.id === kid)?.shelfTitle ?? labels.allTitle;
  return (
    <section aria-labelledby="shelf-title" style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
        <h2 id="shelf-title" style={{ font: "var(--type-h3)" }}>{title}</h2>
        <Tabs label={labels.filter} value={tab} onChange={setTab} items={[{ id: "recent", label: labels.recent, icon: "clock" }, { id: "fav", label: labels.favorites, icon: "heart" }]} />
      </div>
      {kids.length > 1 && (
        <div role="group" aria-label={labels.filter} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[{ id: "all", name: labels.all }, ...kids].map((k, i) => (
            <button key={k.id} type="button" className="sl-tag" aria-pressed={kid === k.id} onClick={() => setKid(k.id)}>
              {k.id === "all" ? <Icon name="books" /> : <Avatar name={k.name} size={24} ring={false} tone={AVATAR_TONES[(i - 1) % AVATAR_TONES.length]} />}
              {k.name}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <Card tone="paper" variant="flat" padding={32} style={{ display: "grid", gridTemplateColumns: "minmax(0,160px) 1fr", gap: 24, alignItems: "center" }}>
          <BlobFrame shape={3} tone="sky" icon="books" label="" sticker={false} />
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ font: "var(--type-h4)" }}>{labels.emptyTitle}</h3>
            <p style={{ color: "var(--ink-700)" }}>{labels.emptyBody}</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,44%),1fr))", gap: "clamp(14px, 2.4vw, 24px)" }}>
          {shown.map((b, i) => (
            <StoryCard key={b.id} href={`/dashboard/books/${b.id}`} title={b.title} coverSrc={b.coverUrl} coverAlt="" coverTone={b.tone} coverIcon="book-open-text"
              pages={b.pagesLabel} ageRange={b.ageLabel} badge={b.badge} badgeTone={b.badgeTone} progress={b.progress} tilt={[-1, 1, -0.5, 0.8][i % 4]} />
          ))}
        </div>
      )}
    </section>
  );
}
