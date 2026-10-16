import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { buildPageSequence, type AgeRange, type Language, type Orientation, type TextPosition } from "@/lib/book/layout-spec";

export type ReaderPage = {
  kind: "front_cover" | "dedication" | "story" | "back_cover";
  text?: string; textPosition?: TextPosition; imageUrl: string | null; imageAlt?: string; pageNumber: number | null;
};
export type ReaderBook = {
  id: string; title: string; language: Language; orientation: Orientation; ageRange: AgeRange; pages: ReaderPage[]; startIndex: number;
};

/**
 * A finished, entitled book assembled for reading from stored assets only —
 * nothing is regenerated. Returns null when the parent may not read it yet.
 */
export async function getReaderBook(id: string): Promise<ReaderBook | null> {
  const db = await createClient();
  const [{ data: b }, { data: entitled }] = await Promise.all([
    db.from("books").select("id, title, status, language, orientation, age_range, page_count, dedication, current_version_id").eq("id", id).maybeSingle(),
    db.rpc("has_book_entitlement", { p_book_id: id }),
  ]);
  if (!b || !entitled || b.status !== "completed" || !b.current_version_id) return null;

  const [{ data: pages }, { data: images }, { data: progress }] = await Promise.all([
    db.from("book_pages").select("page_number, text, text_position, scene_description").eq("version_id", b.current_version_id).order("page_number"),
    db.from("generated_illustrations").select("kind, page_number, storage_path").eq("book_id", id).eq("quality_tier", "final").eq("is_current", true),
    db.from("reading_progress").select("last_page, completed_at").eq("book_id", id).maybeSingle(),
  ]);
  const urls = await signedUrls("illustrations", (images ?? []).map((i) => i.storage_path), 4 * 3600);
  const url = (kind: string, n: number | null) => {
    const row = (images ?? []).find((i) => i.kind === kind && (n === null ? i.page_number === null : i.page_number === n));
    return row ? urls.get(row.storage_path) ?? null : null;
  };

  const sequence = buildPageSequence(b.page_count, Boolean(b.dedication));
  const readerPages: ReaderPage[] = sequence.map((s) => {
    if (s.kind === "front_cover") return { kind: s.kind, imageUrl: url("front_cover", null), pageNumber: null };
    if (s.kind === "back_cover") return { kind: s.kind, imageUrl: url("back_cover", null), pageNumber: null };
    if (s.kind === "dedication") return { kind: s.kind, text: b.dedication ?? "", imageUrl: null, pageNumber: null };
    const p = (pages ?? []).find((x) => x.page_number === s.storyPageNumber);
    return { kind: "story", text: p?.text ?? "", textPosition: p?.text_position, imageUrl: url("page", s.storyPageNumber), imageAlt: p?.scene_description ?? "", pageNumber: s.storyPageNumber };
  });
  // Resume where they left off, unless they finished — then start again from the cover.
  const startIndex = progress && !progress.completed_at ? Math.min(progress.last_page, readerPages.length - 1) : 0;
  return { id: b.id, title: b.title ?? "", language: b.language, orientation: b.orientation, ageRange: b.age_range, pages: readerPages, startIndex };
}
