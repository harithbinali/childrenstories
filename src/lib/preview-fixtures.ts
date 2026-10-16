import type { Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/config";
import type { Overview } from "@/lib/dashboard/overview";
import type { ChildDetail, ChildSummary } from "@/lib/children/queries";
import type { CharacterDetail } from "@/lib/characters/queries";
import type { BookWorkspace, CreatorData } from "@/lib/books/queries";

/**
 * INTERNAL PREVIEW DATA for /design-system/preview/* only — lets designers
 * review catalog-driven sections without a database. Mirrors the seed in
 * supabase/migrations/20261016000600_reference_data.sql. Never used by
 * production pages.
 */
export function previewCatalog(locale: Locale): Catalog {
  const ar = locale === "ar";
  const t = (slug: string, en: string, a: string, featured = false) => ({ id: `theme-${slug}`, slug, name: ar ? a : en, description: "", isCustom: slug === "custom", isFeatured: featured });
  return {
    themes: [
      t("magical-adventure", "Magical Adventure", "مغامرة سحرية", true), t("space-adventure", "Space Adventure", "مغامرة في الفضاء", true),
      t("underwater-adventure", "Underwater Adventure", "مغامرة تحت الماء", true), t("dinosaur-world", "Dinosaur World", "عالم الديناصورات", true),
      t("superhero-adventure", "Superhero Adventure", "مغامرة بطل خارق", true), t("enchanted-forest", "Enchanted Forest", "الغابة المسحورة"),
      t("bedtime", "Bedtime", "قصة قبل النوم"), t("birthday", "Birthday", "عيد الميلاد"),
    ],
    styles: [
      { id: "style-3d", slug: "3d-cartoon", name: ar ? "كرتون ثلاثي الأبعاد" : "3D Cartoon", description: ar ? "شخصيات ثلاثية الأبعاد ناعمة ومستديرة بإضاءة دافئة." : "Soft, rounded 3D characters with warm studio lighting.", previewPath: null },
      { id: "style-wc", slug: "watercolor-storybook", name: ar ? "ألوان مائية" : "Watercolor Storybook", description: ar ? "رسومات بالألوان المائية مثل كتب الأطفال الكلاسيكية." : "Hand-painted watercolor washes like a classic picture book.", previewPath: null },
      { id: "style-2d", slug: "2d-cartoon", name: ar ? "كرتون ثنائي الأبعاد" : "2D Cartoon", description: ar ? "رسوم كرتونية ثنائية الأبعاد بألوان زاهية." : "Bold, clean 2D cartoon with bright flat colors.", previewPath: null },
      { id: "style-mf", slug: "magical-fairytale", name: ar ? "حكاية خيالية ساحرة" : "Magical Fairytale", description: ar ? "لوحة خيالية حالمة مضيئة مع لمعان وبريق." : "Dreamy, luminous fairytale painting with sparkles and glow.", previewPath: null },
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


export function previewChildren(locale: Locale): ChildSummary[] {
  const ar = locale === "ar";
  return [
    { id: "k1", name: ar ? "ليلى" : "Layla", ageYears: 6, photoCount: 2, characterCount: 1, bookCount: 3 },
    { id: "k2", name: ar ? "عمر" : "Omar", ageYears: 4, photoCount: 1, characterCount: 1, bookCount: 2 },
  ];
}

export function previewChildDetail(locale: Locale): ChildDetail {
  const ar = locale === "ar";
  return {
    id: "k1", display_name: ar ? "ليلى" : "Layla", age_years: 6, interests: ar ? ["الديناصورات", "الرسم"] : ["dinosaurs", "painting"],
    preferred_language: locale, appearance_notes: null,
    photos: [{ id: "p1", url: null, deleteAfter: null }, { id: "p2", url: null, deleteAfter: null }],
    characters: [{ id: "c1", name: ar ? "ليلى" : "Layla", status: "approved", imageUrl: null }, { id: "c2", name: ar ? "ليلى الفضائية" : "Space Layla", status: "ready", imageUrl: null }],
    books: [{ id: "b1", title: ar ? "ليلى والنجمة الضائعة" : "Layla and the Lost Star", status: "completed", pageCount: 12 }],
  };
}

export function previewCharacter(locale: Locale, status: "generating" | "ready" | "approved"): CharacterDetail {
  const ar = locale === "ar";
  return {
    id: "c1", name: ar ? "ليلى" : "Layla", status, childId: "k1", childName: ar ? "ليلى" : "Layla", styleId: "style-3d",
    styleName: ar ? "كرتون ثلاثي الأبعاد" : "3D Cartoon", correctionNotes: null, generationCount: 2,
    approvedReferenceId: status === "approved" ? "r2" : null, latestReferenceId: "r2",
    references: status === "generating" ? [{ id: "r1", url: null, createdAt: "2026-10-15T10:00:00Z" }] : [{ id: "r2", url: null, createdAt: "2026-10-15T11:00:00Z" }, { id: "r1", url: null, createdAt: "2026-10-15T10:00:00Z" }],
    job: status === "generating" ? { status: "processing", stage: "drawing_character", progress: 45, error: null } : null,
  };
}

export function previewCreatorData(locale: Locale): CreatorData {
  const ar = locale === "ar";
  return {
    children: [
      { id: "k1", name: ar ? "ليلى" : "Layla", ageYears: 6, preferredLanguage: locale, characters: [{ id: "c1", name: ar ? "ليلى" : "Layla", imageUrl: null }, { id: "c2", name: ar ? "ليلى الفضائية" : "Space Layla", imageUrl: null }] },
      { id: "k2", name: ar ? "عمر" : "Omar", ageYears: 4, preferredLanguage: locale, characters: [] },
    ],
  };
}

export function previewWorkspace(locale: Locale, status: string, orientation: "portrait" | "landscape" = "portrait"): BookWorkspace {
  const ar = locale === "ar";
  const texts = ar
    ? ["في ليلة مليئة بالنجوم، وجدت ليلى باباً صغيراً في آخر الحديقة.", "همست غيمة صغيرة ناعسة: «مرحباً، لقد ضللت طريقي إلى البيت.»", "أمسكت ليلى بيد الغيمة الناعمة وطارتا فوق المدينة النائمة.", "على قمة التلّ كانت النجوم تغنّي أغنية هادئة."]
    : ["Once upon a starry night, Layla found a tiny door at the bottom of the garden.", "“Hello,” whispered a sleepy little cloud. “I've lost my way home.”", "Layla held the cloud's soft hand and they floated over the sleeping town.", "On top of the hill, the stars were humming a gentle song."];
  const pages = Array.from({ length: 8 }, (_, i) => ({ number: i + 1, text: texts[i % 4], scene: "", textPosition: (orientation === "portrait" ? "bottom" : i % 2 ? "end" : "start") as "bottom", previewUrl: null, finalUrl: null }));
  return {
    id: "b1", title: ar ? "ليلى والغيمة الضائعة" : "Layla and the Lost Cloud", status, language: locale, ageRange: "3-5", pageCount: 8, orientation,
    dedication: ar ? "إلى ليلى، مع كل الحب" : "For Layla, with all our love", isFavorite: status === "completed", entitled: ["producing", "completed"].includes(status),
    pdfReady: status === "completed", childName: ar ? "ليلى" : "Layla", characterName: ar ? "ليلى" : "Layla", versionNumber: 2, pages,
    cover: { previewUrl: null, finalUrl: null }, backCover: { finalUrl: null },
    jobs: { active: status === "producing" ? 4 : 0, storyRunning: false, rewritingPages: status === "story_ready" ? [3] : [], illustratingPages: [], finalDone: status === "producing" ? 6 : 10, finalTotal: 10, pdfRunning: false, lastError: null },
    usage: { textRedrawsUsed: 1, imageRedrawsUsed: 2, included: 8, previewsUsed: 2 },
    price: { amount: 1900, currency: "USD" }, gateways: ["stripe", "paypal"], order: null, readingPage: status === "completed" ? 3 : 0,
  };
}
