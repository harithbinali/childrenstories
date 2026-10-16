import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/storage";
import type { AgeRange, Language, Orientation, TextPosition } from "@/lib/book/layout-spec";

export type BookListItem = {
  id: string; title: string | null; status: string; pageCount: number; ageRange: string; orientation: string; language: string;
  isFavorite: boolean; entitled: boolean; coverUrl: string | null; childName: string | null; createdAt: string;
};

const DRAFT_STATUSES = ["draft", "story_generating", "story_ready", "story_approved", "illustrating", "preview_ready", "failed"];

export async function listBooks(filter: "all" | "drafts" | "favorites"): Promise<BookListItem[]> {
  const db = await createClient();
  let q = db.from("books").select("id, title, status, page_count, age_range, orientation, language, is_favorite, created_at, child_profiles(display_name)").order("updated_at", { ascending: false });
  if (filter === "drafts") q = q.in("status", DRAFT_STATUSES);
  if (filter === "favorites") q = q.eq("is_favorite", true);
  const [{ data, error }, { data: ents }] = await Promise.all([q, db.from("book_entitlements").select("book_id").is("revoked_at", null)]);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const covers = rows.length
    ? (await db.from("generated_illustrations").select("book_id, storage_path, quality_tier").in("book_id", rows.map((r) => r.id)).eq("kind", "front_cover").eq("is_current", true)).data ?? []
    : [];
  const coverPath = new Map<string, string>();
  for (const c of covers) if (!coverPath.has(c.book_id) || c.quality_tier === "final") coverPath.set(c.book_id, c.storage_path);
  const urls = await signedUrls("illustrations", [...coverPath.values()], 3600);
  const entitled = new Set((ents ?? []).map((e) => e.book_id));
  return rows.map((b) => ({
    id: b.id, title: b.title, status: b.status, pageCount: b.page_count, ageRange: b.age_range, orientation: b.orientation, language: b.language,
    isFavorite: b.is_favorite, entitled: entitled.has(b.id), createdAt: b.created_at,
    childName: (b.child_profiles as unknown as { display_name: string } | null)?.display_name ?? null,
    coverUrl: coverPath.has(b.id) ? urls.get(coverPath.get(b.id)!) ?? null : null,
  }));
}

export type WorkspacePage = { number: number; text: string; scene: string; textPosition: TextPosition; previewUrl: string | null; finalUrl: string | null };
export type BookWorkspace = {
  id: string; title: string | null; status: string; language: Language; ageRange: AgeRange; pageCount: number; orientation: Orientation;
  dedication: string | null; isFavorite: boolean; entitled: boolean; pdfReady: boolean; childName: string | null; characterName: string | null;
  versionNumber: number | null;
  pages: WorkspacePage[];
  cover: { previewUrl: string | null; finalUrl: string | null };
  backCover: { finalUrl: string | null };
  jobs: { active: number; storyRunning: boolean; rewritingPages: number[]; illustratingPages: number[]; finalDone: number; finalTotal: number; pdfRunning: boolean; lastError: string | null };
  usage: { textRedrawsUsed: number; imageRedrawsUsed: number; included: number; previewsUsed: number };
  price: { amount: number; currency: string } | null;
  gateways: Array<"stripe" | "paypal">;
  order: { status: string; orderNumber: number } | null;
  readingPage: number;
};

export async function getBookWorkspace(id: string): Promise<BookWorkspace | null> {
  const db = await createClient();
  const { data: b } = await db
    .from("books")
    .select("id, title, status, language, age_range, page_count, orientation, dedication, is_favorite, pdf_path, current_version_id, text_regenerations_used, image_regenerations_used, product_id, child_profiles(display_name), characters(name), book_products(price_amount, currency, included_regenerations)")
    .eq("id", id)
    .maybeSingle();
  if (!b) return null;

  const [version, pages, images, jobs, ent, order, progress] = await Promise.all([
    b.current_version_id ? db.from("book_versions").select("version_number").eq("id", b.current_version_id).single() : null,
    b.current_version_id ? db.from("book_pages").select("page_number, text, scene_description, text_position").eq("version_id", b.current_version_id).order("page_number") : null,
    db.from("generated_illustrations").select("kind, page_number, quality_tier, storage_path").eq("book_id", id).eq("is_current", true),
    db.from("generation_jobs").select("type, status, payload, last_error, created_at").eq("book_id", id).order("created_at", { ascending: false }).limit(80),
    db.from("book_entitlements").select("book_id").eq("book_id", id).is("revoked_at", null).maybeSingle(),
    db.from("orders").select("status, order_number").eq("book_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("reading_progress").select("last_page").eq("book_id", id).maybeSingle(),
  ]);

  const urls = await signedUrls("illustrations", (images.data ?? []).map((i) => i.storage_path), 3600);
  const img = (kind: string, page: number | null, tier: string) => {
    const row = (images.data ?? []).find((i) => i.kind === kind && i.quality_tier === tier && (page === null ? i.page_number === null : i.page_number === page));
    return row ? urls.get(row.storage_path) ?? null : null;
  };

  const jobRows = jobs.data ?? [];
  const active = jobRows.filter((j) => j.status === "queued" || j.status === "processing");
  const pageOf = (j: { payload: unknown }) => Number((j.payload as { page_number?: number })?.page_number ?? 0);
  const finalImgs = (images.data ?? []).filter((i) => i.quality_tier === "final").length;
  const product = b.book_products as unknown as { price_amount: number; currency: string; included_regenerations: number } | null;

  // Gateway configs are staff-only under RLS; only the enabled flags are read here (no secrets exist in this table).
  const { data: gw } = await createAdminClient().from("payment_gateway_configs").select("gateway, is_enabled").eq("is_enabled", true);

  return {
    id: b.id, title: b.title, status: b.status, language: b.language, ageRange: b.age_range, pageCount: b.page_count, orientation: b.orientation,
    dedication: b.dedication, isFavorite: b.is_favorite, entitled: Boolean(ent.data), pdfReady: Boolean(b.pdf_path),
    childName: (b.child_profiles as unknown as { display_name: string } | null)?.display_name ?? null,
    characterName: (b.characters as unknown as { name: string } | null)?.name ?? null,
    versionNumber: version?.data?.version_number ?? null,
    pages: (pages?.data ?? []).map((p) => ({
      number: p.page_number, text: p.text, scene: p.scene_description, textPosition: p.text_position,
      previewUrl: img("page", p.page_number, "preview"), finalUrl: img("page", p.page_number, "final"),
    })),
    cover: { previewUrl: img("front_cover", null, "preview"), finalUrl: img("front_cover", null, "final") },
    backCover: { finalUrl: img("back_cover", null, "final") },
    jobs: {
      active: active.length,
      storyRunning: active.some((j) => j.type === "story_generate"),
      rewritingPages: active.filter((j) => j.type === "story_rewrite_page").map(pageOf),
      illustratingPages: active.filter((j) => j.type === "page_illustration").map(pageOf),
      finalDone: finalImgs,
      finalTotal: b.page_count + 2,
      pdfRunning: active.some((j) => j.type === "pdf_render"),
      lastError: jobRows.find((j) => j.status === "failed")?.last_error ?? null,
    },
    usage: {
      textRedrawsUsed: b.text_regenerations_used, imageRedrawsUsed: b.image_regenerations_used, included: product?.included_regenerations ?? b.page_count,
      previewsUsed: (images.data ?? []).filter((i) => i.quality_tier === "preview" && i.kind === "page").length,
    },
    price: product ? { amount: product.price_amount, currency: product.currency } : null,
    gateways: (gw ?? []).map((g) => g.gateway as "stripe" | "paypal"),
    order: order.data ? { status: order.data.status, orderNumber: order.data.order_number } : null,
    readingPage: progress.data?.last_page ?? 0,
  };
}

export type CreatorData = {
  children: Array<{ id: string; name: string; ageYears: number | null; preferredLanguage: string; characters: Array<{ id: string; name: string; imageUrl: string | null }> }>;
};

/** Children with their approved characters (only approved characters can star in books). */
export async function getCreatorData(): Promise<CreatorData> {
  const db = await createClient();
  const { data, error } = await db
    .from("child_profiles")
    .select("id, display_name, age_years, preferred_language, characters(id, name, status, approved:character_references!characters_approved_reference_fk(storage_path))")
    .order("created_at");
  if (error) throw new Error(error.message);
  type Ch = { id: string; name: string; status: string; approved: { storage_path: string } | null };
  const chars = (data ?? []).flatMap((c) => (c.characters as unknown as Ch[]).filter((ch) => ch.status === "approved"));
  const urls = await signedUrls("character-refs", chars.map((ch) => ch.approved?.storage_path).filter((p): p is string => !!p), 3600);
  return {
    children: (data ?? []).map((c) => ({
      id: c.id, name: c.display_name, ageYears: c.age_years, preferredLanguage: c.preferred_language,
      characters: (c.characters as unknown as Ch[]).filter((ch) => ch.status === "approved").map((ch) => ({ id: ch.id, name: ch.name, imageUrl: ch.approved ? urls.get(ch.approved.storage_path) ?? null : null })),
    })),
  };
}
