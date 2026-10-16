import "@/lib/server-guard";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";

export type CatalogTheme = { slug: string; name: string; description: string; isCustom: boolean; isFeatured: boolean };
export type CatalogStyle = { slug: string; name: string; description: string; previewPath: string | null };
export type CatalogProduct = { id: string; sku: string; name: string; pageCount: number; priceAmount: number; currency: string };
export type Catalog = { themes: CatalogTheme[]; styles: CatalogStyle[]; products: CatalogProduct[] };

export const CATALOG_TAG = "catalog";

/**
 * Public, admin-managed catalog (active rows only, via RLS as `anon`).
 * Cached across requests; admin edits call revalidateTag(CATALOG_TAG).
 * Returns null when Supabase isn't configured (e.g. local UI work).
 */
export async function getPublicCatalog(locale: Locale): Promise<Catalog | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [themes, styles, products] = await Promise.all([
    db.from("story_themes").select("slug, name_en, name_ar, description_en, description_ar, is_custom, is_featured").order("sort_order"),
    db.from("illustration_styles").select("slug, name_en, name_ar, description_en, description_ar, preview_image_path").order("sort_order"),
    db.from("book_products").select("id, sku, name_en, name_ar, page_count, price_amount, currency").order("page_count"),
  ]);
  const err = themes.error ?? styles.error ?? products.error;
  if (err) throw new Error(`catalog unavailable: ${err.message}`);

  const ar = locale === "ar";
  return {
    themes: (themes.data ?? []).map((t) => ({
      slug: t.slug, name: ar ? t.name_ar : t.name_en, description: ar ? t.description_ar : t.description_en, isCustom: t.is_custom, isFeatured: t.is_featured,
    })),
    styles: (styles.data ?? []).map((s) => ({
      slug: s.slug, name: ar ? s.name_ar : s.name_en, description: ar ? s.description_ar : s.description_en, previewPath: s.preview_image_path,
    })),
    products: (products.data ?? []).map((p) => ({
      id: p.id, sku: p.sku, name: ar ? p.name_ar : p.name_en, pageCount: p.page_count, priceAmount: p.price_amount, currency: p.currency,
    })),
  };
}

/** Presentation mapping for themes (icons are a UI concern, not catalog data). */
export const THEME_ICONS: Record<string, string> = {
  "magical-adventure": "magic-wand", "space-adventure": "rocket-launch", "underwater-adventure": "fish", "dinosaur-world": "paw-print",
  "enchanted-forest": "tree-evergreen", "superhero-adventure": "lightning", "animal-friends": "rabbit", bedtime: "moon-stars", birthday: "cake",
  friendship: "hand-heart", kindness: "heart", courage: "shield-star", learning: "lightbulb", custom: "pencil-simple-line",
};
export const STYLE_ICONS: Record<string, string> = {
  "3d-cartoon": "cube", "watercolor-storybook": "paint-brush-broad", "2d-cartoon": "pencil-circle", "magical-fairytale": "sparkle",
};
