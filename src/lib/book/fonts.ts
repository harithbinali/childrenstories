/**
 * Font faces used inside book pages (reader + PDF). PROVISIONAL: replace with
 * the typography defined by the Storyling Design System. Files live in
 * /public/fonts so the reader can load them and the PDF renderer can embed
 * them.
 */
export type BookFontFace = { family: string; file: string; weight: number; style?: "normal" | "italic"; language: "ar" | "en" };

export const BOOK_FONT_FACES: BookFontFace[] = [
  { family: "Noto Naskh Arabic", file: "fonts/provisional/NotoNaskhArabic-Regular.ttf", weight: 400, language: "ar" },
  { family: "Noto Naskh Arabic", file: "fonts/provisional/NotoNaskhArabic-Bold.ttf", weight: 700, language: "ar" },
];
