/**
 * Font faces embedded in PDFs — the Storyling story typefaces
 * (--font-story-latin: Andika, --font-story-ar: Baloo Bhaijaan 2).
 * Files live in /public/fonts/book (OFL licensed).
 */
export type BookFontFace = { family: string; file: string; weight: string; style?: "normal" | "italic" };

export const BOOK_FONT_FACES: BookFontFace[] = [
  { family: "Andika", file: "fonts/book/Andika-Regular.ttf", weight: "400" },
  { family: "Andika", file: "fonts/book/Andika-Bold.ttf", weight: "700" },
  // Static instances of the variable font (fontTools varLib.instancer): Chromium embeds
  // variable fonts as Type 3, which print shops often reject.
  { family: "Baloo Bhaijaan 2", file: "fonts/book/BalooBhaijaan2-400.ttf", weight: "400" },
  { family: "Baloo Bhaijaan 2", file: "fonts/book/BalooBhaijaan2-700.ttf", weight: "700" },
];
