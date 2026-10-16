import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export type CharacterCard = { id: string; name: string; status: string; childName: string | null; imageUrl: string | null };

export async function listCharacters(): Promise<CharacterCard[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("characters")
    .select("id, name, status, child_profiles(display_name), approved:character_references!characters_approved_reference_fk(storage_path), latest:character_references!characters_latest_reference_id_fkey(storage_path)")
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const path = (c: { approved: unknown; latest: unknown }) =>
    (c.approved as { storage_path?: string } | null)?.storage_path ?? (c.latest as { storage_path?: string } | null)?.storage_path ?? null;
  const urls = await signedUrls("character-refs", (data ?? []).map(path).filter((p): p is string => !!p), 3600);
  return (data ?? []).map((c) => ({
    id: c.id, name: c.name, status: c.status,
    childName: (c.child_profiles as unknown as { display_name: string } | null)?.display_name ?? null,
    imageUrl: urls.get(path(c) ?? "") ?? null,
  }));
}

export type CharacterDetail = {
  id: string; name: string; status: string; childId: string; childName: string; styleId: string; styleName: string;
  correctionNotes: string | null; generationCount: number; approvedReferenceId: string | null; latestReferenceId: string | null;
  references: Array<{ id: string; url: string | null; createdAt: string }>;
  job: { status: string; stage: string; progress: number; error: string | null } | null;
};

export async function getCharacter(id: string, locale: "en" | "ar"): Promise<CharacterDetail | null> {
  const db = await createClient();
  const { data: c } = await db
    .from("characters")
    .select("id, name, status, child_id, style_id, correction_notes, generation_count, approved_reference_id, latest_reference_id, child_profiles(display_name), illustration_styles(name_en, name_ar)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const [refs, job] = await Promise.all([
    db.from("character_references").select("id, storage_path, created_at").eq("character_id", id).neq("kind", "scene_test").order("created_at", { ascending: false }),
    db.from("generation_jobs").select("status, stage, progress, last_error").eq("character_id", id).eq("type", "character_generate").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const urls = await signedUrls("character-refs", (refs.data ?? []).map((r) => r.storage_path), 3600);
  const style = c.illustration_styles as unknown as { name_en: string; name_ar: string } | null;
  return {
    id: c.id, name: c.name, status: c.status, childId: c.child_id,
    childName: (c.child_profiles as unknown as { display_name: string } | null)?.display_name ?? "",
    styleId: c.style_id, styleName: style ? (locale === "ar" ? style.name_ar : style.name_en) : "",
    correctionNotes: c.correction_notes, generationCount: c.generation_count,
    approvedReferenceId: c.approved_reference_id, latestReferenceId: c.latest_reference_id,
    references: (refs.data ?? []).map((r) => ({ id: r.id, url: urls.get(r.storage_path) ?? null, createdAt: r.created_at })),
    job: job.data ? { status: job.data.status, stage: job.data.stage, progress: job.data.progress, error: job.data.last_error } : null,
  };
}
