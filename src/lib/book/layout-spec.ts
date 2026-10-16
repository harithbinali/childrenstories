/**
 * Shared book layout specification used by BOTH the online reader and the PDF
 * renderer, so a page looks the same on a tablet and in print.
 *
 * Design decisions (see docs/ARCHITECTURE.md#book-layout):
 *  - The page aspect ratio equals the generated illustration's aspect ratio
 *    (portrait 2:3, landscape 3:2). Illustrations are never cropped to fit a
 *    different page shape and never stretched between orientations.
 *  - Story text is NOT baked into images. Each page reserves a text region
 *    that the illustration prompt keeps visually calm; text is laid over it
 *    on a soft paper panel, which keeps text editable, translatable,
 *    crisp in print and accessible to screen readers.
 *  - Page count counts STORY pages only. Front cover, dedication and back
 *    cover are added on top of it.
 */

export type Orientation = "portrait" | "landscape";
export type Language = "en" | "ar";
export type AgeRange = "0-2" | "3-5" | "6-8" | "9-12";
export type TextPosition = "top" | "bottom" | "start" | "end";

/** Print trim size in PDF points (72pt = 1in). */
export const TRIM = {
  portrait: { width: 576, height: 864 }, // 8in x 12in
  landscape: { width: 864, height: 576 }, // 12in x 8in
} as const satisfies Record<Orientation, { width: number; height: number }>;

/** Print bleed added around full-bleed artwork (0.125in). */
export const BLEED_PT = 9;

/** Image generation sizes — same aspect ratio as TRIM. */
export const IMAGE_SIZE = {
  portrait: "1024x1536",
  landscape: "1536x1024",
} as const satisfies Record<Orientation, string>;

export function aspectRatio(o: Orientation): number {
  return TRIM[o].width / TRIM[o].height;
}

/** Text positions allowed per orientation (logical: start/end flip in RTL). */
export const TEXT_POSITIONS: Record<Orientation, readonly TextPosition[]> = {
  portrait: ["bottom", "top"],
  landscape: ["start", "end", "bottom"],
};

export type Rect = { x: number; y: number; width: number; height: number };

/** Safe margin inside the trim where nothing important may be placed (0.375in). */
export const SAFE_MARGIN_PT = 27;

/**
 * Text panel rectangle as fractions (0..1) of the page, resolved for the
 * reading direction. Fractions let the reader (CSS %) and PDF (points) share it.
 */
export function textRegion(o: Orientation, position: TextPosition, language: Language): Rect {
  const m = SAFE_MARGIN_PT / TRIM[o].width;
  const mv = SAFE_MARGIN_PT / TRIM[o].height;
  const rtl = language === "ar";
  if (position === "top" || position === "bottom") {
    const h = o === "portrait" ? 0.26 : 0.3;
    return { x: m, width: 1 - 2 * m, height: h, y: position === "top" ? mv : 1 - mv - h };
  }
  // start/end: a side column, mirrored for RTL
  const w = 0.36;
  const left = (position === "start") !== rtl;
  return { x: left ? m : 1 - m - w, y: mv, width: w, height: 1 - 2 * mv };
}

/** Plain-language composition note sent to the image model for the reserved text area. */
export function compositionInstruction(o: Orientation, position: TextPosition, language: Language): string {
  const r = textRegion(o, position, language);
  const where =
    position === "top" ? "the top" : position === "bottom" ? "the bottom" : r.x < 0.5 ? "the left side" : "the right side";
  const pct = Math.round((position === "top" || position === "bottom" ? r.height : r.width) * 100);
  return `Keep roughly ${pct}% of the image at ${where} as calm, simple background (sky, wall, grass, water) with no faces, characters, text or important details, because story text will be placed there. Keep all characters and key action inside the remaining area and away from the outer edges.`;
}

/** Story typography by reader age. Sizes in points at TRIM size. */
export function storyTypography(age: AgeRange, language: Language, o: Orientation) {
  const base = { "0-2": 30, "3-5": 26, "6-8": 22, "9-12": 19 }[age];
  // Arabic script needs a little more size and line height at the same legibility.
  const size = Math.round((language === "ar" ? base * 1.08 : base) * (o === "landscape" ? 0.95 : 1));
  return {
    fontSizePt: size,
    lineHeight: language === "ar" ? 1.7 : 1.4,
    maxWordsPerPage: { "0-2": 25, "3-5": 60, "6-8": 110, "9-12": 170 }[age],
    direction: language === "ar" ? ("rtl" as const) : ("ltr" as const),
    align: language === "ar" ? ("right" as const) : ("left" as const),
  };
}

export type BookPageKind = "front_cover" | "dedication" | "story" | "back_cover";

export type SequencedPage = {
  index: number; // 0-based position in the reading sequence
  kind: BookPageKind;
  storyPageNumber: number | null; // 1..page_count for story pages
};

/** Full reading/printing order. pageCount counts story pages only. */
export function buildPageSequence(pageCount: number, hasDedication: boolean): SequencedPage[] {
  if (![8, 12, 16].includes(pageCount)) throw new Error(`unsupported page count ${pageCount}`);
  const seq: Omit<SequencedPage, "index">[] = [{ kind: "front_cover", storyPageNumber: null }];
  if (hasDedication) seq.push({ kind: "dedication", storyPageNumber: null });
  for (let n = 1; n <= pageCount; n++) seq.push({ kind: "story", storyPageNumber: n });
  seq.push({ kind: "back_cover", storyPageNumber: null });
  return seq.map((p, index) => ({ ...p, index }));
}

/**
 * Two-page spreads for wide screens: the cover stands alone (as in a printed
 * book), then pages pair up. For RTL books the pair is displayed right-to-left.
 */
export function buildSpreads(sequence: SequencedPage[], language: Language): SequencedPage[][] {
  const [cover, ...rest] = sequence;
  const spreads: SequencedPage[][] = [[cover]];
  for (let i = 0; i < rest.length; i += 2) spreads.push(rest.slice(i, i + 2));
  return language === "ar" ? spreads.map((s) => [...s].reverse()) : spreads;
}

/** Whether a reader viewport should show two-page spreads. */
export function shouldUseSpreads(o: Orientation, viewport: { width: number; height: number }): boolean {
  const spreadAspect = 2 * aspectRatio(o);
  const viewportAspect = viewport.width / viewport.height;
  // Only when two pages side by side would each still be reasonably large.
  return viewport.width >= 900 && viewportAspect >= spreadAspect * 0.8;
}

/** Fit a page of the given orientation inside a viewport without cropping. */
export function fitPage(o: Orientation, box: { width: number; height: number }, pagesAcross = 1) {
  const ar = aspectRatio(o) * pagesAcross;
  const width = Math.min(box.width, box.height * ar);
  return { width: width / pagesAcross, height: width / ar };
}
