import type { Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/config";

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
