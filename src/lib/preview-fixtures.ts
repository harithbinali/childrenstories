import type { Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/config";
import type { Overview } from "@/lib/dashboard/overview";

/**
 * INTERNAL PREVIEW DATA for /design-system/preview/* only — lets designers
 * review catalog-driven sections without a database. Mirrors the seed in
 * supabase/migrations/20261016000600_reference_data.sql. Never used by
 * production pages.
 */
export function previewCatalog(locale: Locale): Catalog {
  const ar = locale === "ar";
  const t = (slug: string, en: string, a: string, featured = false) => ({ slug, name: ar ? a : en, description: "", isCustom: slug === "custom", isFeatured: featured });
  return {
    themes: [
      t("magical-adventure", "Magical Adventure", "مغامرة سحرية", true), t("space-adventure", "Space Adventure", "مغامرة في الفضاء", true),
      t("underwater-adventure", "Underwater Adventure", "مغامرة تحت الماء", true), t("dinosaur-world", "Dinosaur World", "عالم الديناصورات", true),
      t("superhero-adventure", "Superhero Adventure", "مغامرة بطل خارق", true), t("enchanted-forest", "Enchanted Forest", "الغابة المسحورة"),
      t("bedtime", "Bedtime", "قصة قبل النوم"), t("birthday", "Birthday", "عيد الميلاد"),
    ],
    styles: [
      { slug: "3d-cartoon", name: ar ? "كرتون ثلاثي الأبعاد" : "3D Cartoon", description: ar ? "شخصيات ثلاثية الأبعاد ناعمة ومستديرة بإضاءة دافئة." : "Soft, rounded 3D characters with warm studio lighting.", previewPath: null },
      { slug: "watercolor-storybook", name: ar ? "ألوان مائية" : "Watercolor Storybook", description: ar ? "رسومات بالألوان المائية مثل كتب الأطفال الكلاسيكية." : "Hand-painted watercolor washes like a classic picture book.", previewPath: null },
      { slug: "2d-cartoon", name: ar ? "كرتون ثنائي الأبعاد" : "2D Cartoon", description: ar ? "رسوم كرتونية ثنائية الأبعاد بألوان زاهية." : "Bold, clean 2D cartoon with bright flat colors.", previewPath: null },
      { slug: "magical-fairytale", name: ar ? "حكاية خيالية ساحرة" : "Magical Fairytale", description: ar ? "لوحة خيالية حالمة مضيئة مع لمعان وبريق." : "Dreamy, luminous fairytale painting with sparkles and glow.", previewPath: null },
    ],
    products: [
      { id: "p8", sku: "book-8-usd", name: "8-page storybook", pageCount: 8, priceAmount: 1900, currency: "USD" },
      { id: "p12", sku: "book-12-usd", name: "12-page storybook", pageCount: 12, priceAmount: 2400, currency: "USD" },
      { id: "p16", sku: "book-16-usd", name: "16-page storybook", pageCount: 16, priceAmount: 2900, currency: "USD" },
    ],
  };
}


/** INTERNAL PREVIEW DATA for /design-system/preview/dashboard only. */
export function previewOverview(locale: Locale, empty = false): Overview {
  const ar = locale === "ar";
  if (empty) return { displayName: ar ? "هناء" : "Hana", children: [], books: [], stats: { characters: 0, books: 0, purchased: 0, inProgress: 0 }, activity: [] };
  const kids = [{ id: "k1", name: ar ? "ليلى" : "Layla", ageYears: 6 }, { id: "k2", name: ar ? "عمر" : "Omar", ageYears: 4 }];
  const b = (id: string, title: string, childId: string, status: string, extra: Partial<Overview["books"][number]> = {}) => ({
    id, title, childId, status, pageCount: 12, ageRange: "3-5", isFavorite: false, entitled: status === "completed" || status === "producing",
    coverUrl: null, progress: status === "completed" ? 40 : null, updatedAt: "2026-10-15T18:00:00Z", ...extra,
  });
  return {
    displayName: ar ? "هناء" : "Hana",
    children: kids,
    books: [
      b("b1", ar ? "ليلى والنجمة الضائعة" : "Layla and the Lost Star", "k1", "completed", { isFavorite: true, progress: 100 }),
      b("b2", ar ? "عمر يبني صاروخاً" : "Omar Builds a Rocket", "k2", "completed", { progress: 0 }),
      b("b3", ar ? "الغيمة الصغيرة الشجاعة" : "The Brave Little Cloud", "k1", "preview_ready"),
      b("b4", ar ? "نزهة ليلى تحت الماء" : "Layla's Underwater Picnic", "k1", "producing", { isFavorite: true }),
      b("b5", ar ? "عمر والديناصور اللطيف" : "Omar and the Gentle Dinosaur", "k2", "story_ready", { pageCount: 8 }),
    ],
    stats: { characters: 2, books: 5, purchased: 3, inProgress: 3 },
    activity: [
      { id: "a1", type: "book_production", status: "processing", createdAt: "2026-10-15T18:00:00Z", bookTitle: ar ? "نزهة ليلى تحت الماء" : "Layla's Underwater Picnic" },
      { id: "a2", type: "story_generate", status: "completed", createdAt: "2026-10-15T17:00:00Z", bookTitle: ar ? "عمر والديناصور اللطيف" : "Omar and the Gentle Dinosaur" },
      { id: "a3", type: "character_generate", status: "completed", createdAt: "2026-10-15T16:00:00Z", bookTitle: null },
    ],
  };
}
