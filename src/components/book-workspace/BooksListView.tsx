import { Button, Card, StoryCard } from "@/components/storyling";
import { PageBody, PageHeader } from "@/components/dashboard/ui/PageHeader";
import type { BookListItem } from "@/lib/books/queries";
import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

const TONES = ["sky", "bubble", "mint", "grape", "tangerine", "sun"] as const;

export function BooksListView({ d, locale, books, title, sub }: { d: Dictionary; locale: Locale; books: BookListItem[]; title: string; sub: string }) {
  return (
    <PageBody>
      <PageHeader title={title} sub={sub} actions={<Button iconStart="magic-wand" href="/dashboard/create">{d.books.create}</Button>} />
      {books.length === 0 ? (
        <Card tone="paper" variant="flat" padding={28}><p>{d.books.empty}</p></Card>
      ) : (
        <div style={{ display: "grid", gap: "clamp(14px,2.4vw,24px)", gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,44%),1fr))" }}>
          {books.map((b, i) => (
            <StoryCard key={b.id} href={`/dashboard/books/${b.id}`} title={b.title ?? d.dashboard.untitled} subtitle={b.childName ?? undefined}
              coverSrc={b.coverUrl} coverTone={TONES[i % TONES.length]} pages={d.common.pages(b.pageCount)} ageRange={num(b.ageRange.replace("-", "–"), locale)}
              badge={d.dashboard.status[b.status]}
              badgeTone={b.status === "completed" ? "mint" : b.status === "failed" ? "cherry" : "sky"} tilt={[-1, 1, -0.5, 0.8][i % 4]} />
          ))}
        </div>
      )}
    </PageBody>
  );
}
