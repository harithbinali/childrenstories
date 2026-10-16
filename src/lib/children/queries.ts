import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export type ChildSummary = { id: string; name: string; ageYears: number | null; photoCount: number; characterCount: number; bookCount: number };

export async function listChildren(): Promise<ChildSummary[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("child_profiles")
    .select("id, display_name, age_years, child_photos(count), characters(count), books(count)")
    .order("created_at");
  if (error) throw new Error(error.message);
  const count = (v: unknown) => (Array.isArray(v) ? Number((v[0] as { count?: number })?.count ?? 0) : 0);
  return (data ?? []).map((c) => ({
    id: c.id, name: c.display_name, ageYears: c.age_years,
    photoCount: count(c.child_photos), characterCount: count(c.characters), bookCount: count(c.books),
  }));
}

export type ChildDetail = {
  id: string; display_name: string; age_years: number | null; interests: string[]; preferred_language: string; appearance_notes: string | null;
  photos: Array<{ id: string; url: string | null; deleteAfter: string | null }>;
  characters: Array<{ id: string; name: string; status: string; imageUrl: string | null }>;
  books: Array<{ id: string; title: string | null; status: string; pageCount: number }>;
};

export async function getChild(id: string): Promise<ChildDetail | null> {
  const db = await createClient();
  const { data: c } = await db.from("child_profiles").select("id, display_name, age_years, interests, preferred_language, appearance_notes").eq("id", id).maybeSingle();
  if (!c) return null;
  const [photos, characters, books] = await Promise.all([
    db.from("child_photos").select("id, storage_path, delete_after").eq("child_id", id).order("created_at"),
    db.from("characters").select("id, name, status, approved:character_references!characters_approved_reference_fk(storage_path), latest:character_references!characters_latest_reference_id_fkey(storage_path)").eq("child_id", id).order("created_at"),
    db.from("books").select("id, title, status, page_count").eq("child_id", id).order("updated_at", { ascending: false }),
  ]);
  const photoUrls = await signedUrls("child-photos", (photos.data ?? []).map((p) => p.storage_path), 600);
  const refPath = (ch: { approved: unknown; latest: unknown }) =>
    ((ch.approved as { storage_path?: string } | null)?.storage_path ?? (ch.latest as { storage_path?: string } | null)?.storage_path) ?? null;
  const refUrls = await signedUrls("character-refs", (characters.data ?? []).map(refPath).filter((p): p is string => !!p), 3600);
  return {
    ...c,
    photos: (photos.data ?? []).map((p) => ({ id: p.id, url: photoUrls.get(p.storage_path) ?? null, deleteAfter: p.delete_after })),
    characters: (characters.data ?? []).map((ch) => ({ id: ch.id, name: ch.name, status: ch.status, imageUrl: refUrls.get(refPath(ch) ?? "") ?? null })),
    books: (books.data ?? []).map((b) => ({ id: b.id, title: b.title, status: b.status, pageCount: b.page_count })),
  };
}
