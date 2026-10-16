import "@/lib/server-guard";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";

export type CatalogTheme = { id: string; slug: string; name: string; description: string; isCustom: boolean; isFeatured: boolean };
export type CatalogStyle = { id: string; slug: string; name: string; description: string; previewPath: string | null };
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
    db.from("story_themes").select("id, slug, name_en, name_ar, description_en, description_ar, is_custom, is_featured").order("sort_order"),
    db.from("illustration_styles").select("id, slug, name_en, name_ar, description_en, description_ar, preview_image_path").order("sort_order"),
    db.from("book_products").select("id, sku, name_en, name_ar, page_count, price_amount, currency").order("page_count"),
  ]);
  const err = themes.error ?? styles.error ?? products.error;
  if (err) throw new Error(`catalog unavailable: ${err.message}`);

  const ar = locale === "ar";
  return {
    themes: (themes.data ?? []).map((t) => ({
      id: t.id, slug: t.slug, name: ar ? t.name_ar : t.name_en, description: ar ? t.description_ar : t.description_en, isCustom: t.is_custom, isFeatured: t.is_featured,
    })),
    styles: (styles.data ?? []).map((s) => ({
      id: s.id, slug: s.slug, name: ar ? s.name_ar : s.name_en, description: ar ? s.description_ar : s.description_en, previewPath: s.preview_image_path,
    })),
    products: (products.data ?? []).map((p) => ({
      id: p.id, sku: p.sku, name: ar ? p.name_ar : p.name_en, pageCount: p.page_count, priceAmount: p.price_amount, currency: p.currency,
    })),
  };
}

export { THEME_ICONS, STYLE_ICONS } from "./catalog-icons";
