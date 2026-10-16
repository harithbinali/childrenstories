import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import type { SessionUser } from "@/lib/auth/guards";

export type OverviewChild = { id: string; name: string; ageYears: number | null };
export type OverviewBook = {
  id: string;
  title: string | null;
  childId: string | null;
  status: string;
  pageCount: number;
  ageRange: string;
  isFavorite: boolean;
  entitled: boolean;
  coverUrl: string | null;
  progress: number | null; // 0–100 reading progress for completed books
  updatedAt: string;
};
export type OverviewActivity = { id: string; type: string; status: string; createdAt: string; bookTitle: string | null };
export type Overview = {
  displayName: string | null;
  children: OverviewChild[];
  books: OverviewBook[];
  stats: { characters: number; books: number; purchased: number; inProgress: number };
  activity: OverviewActivity[];
};

const IN_PROGRESS = new Set(["story_generating", "story_ready", "story_approved", "illustrating", "preview_ready", "producing"]);

/** Everything the dashboard home needs, read with the parent's own session (RLS-scoped). */
export async function loadOverview(user: SessionUser): Promise<Overview> {
  const db = await createClient();
  const [children, characters, books, entitlements, progress, jobs] = await Promise.all([
    db.from("child_profiles").select("id, display_name, age_years").order("created_at"),
    db.from("characters").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("books").select("id, title, child_id, status, page_count, age_range, is_favorite, updated_at").order("updated_at", { ascending: false }).limit(60),
    db.from("book_entitlements").select("book_id").is("revoked_at", null),
    db.from("reading_progress").select("book_id, last_page, completed_at"),
    db.from("generation_jobs").select("id, type, status, created_at, book_id").in("type", ["character_generate", "story_generate", "book_production", "pdf_render"]).order("created_at", { ascending: false }).limit(6),
  ]);
  for (const r of [children, books, entitlements, progress, jobs]) if (r.error) throw new Error(r.error.message);

  const bookRows = books.data ?? [];
  const entitled = new Set((entitlements.data ?? []).map((e) => e.book_id));
  const prog = new Map((progress.data ?? []).map((p) => [p.book_id, p]));

  // Covers: newest current front cover per book (final preferred over preview).
  const ids = bookRows.map((b) => b.id);
  const covers = ids.length
    ? await db.from("generated_illustrations").select("book_id, storage_path, quality_tier").in("book_id", ids).eq("kind", "front_cover").eq("is_current", true)
    : { data: [] as Array<{ book_id: string; storage_path: string; quality_tier: string }> };
  const coverPath = new Map<string, string>();
  for (const c of covers.data ?? []) if (!coverPath.has(c.book_id) || c.quality_tier === "final") coverPath.set(c.book_id, c.storage_path);
  const urls = await signedUrls("illustrations", [...coverPath.values()], 3600);

  const titles = new Map(bookRows.map((b) => [b.id, b.title]));
  return {
    displayName: user.displayName,
    children: (children.data ?? []).map((c) => ({ id: c.id, name: c.display_name, ageYears: c.age_years })),
    books: bookRows.map((b) => {
      const p = prog.get(b.id);
      return {
        id: b.id, title: b.title, childId: b.child_id, status: b.status, pageCount: b.page_count, ageRange: b.age_range,
        isFavorite: b.is_favorite, entitled: entitled.has(b.id), updatedAt: b.updated_at,
        coverUrl: coverPath.has(b.id) ? urls.get(coverPath.get(b.id)!) ?? null : null,
        progress: b.status === "completed" ? (p?.completed_at ? 100 : p ? Math.round((p.last_page / (b.page_count + 2)) * 100) : 0) : null,
      };
    }),
    stats: {
      characters: characters.count ?? 0,
      books: bookRows.length,
      purchased: entitled.size,
      inProgress: bookRows.filter((b) => IN_PROGRESS.has(b.status)).length,
    },
    activity: (jobs.data ?? []).map((j) => ({ id: j.id, type: j.type, status: j.status, createdAt: j.created_at, bookTitle: j.book_id ? titles.get(j.book_id) ?? null : null })),
  };
}
