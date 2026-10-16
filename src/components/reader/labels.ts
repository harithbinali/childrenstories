import type { Dictionary } from "@/i18n/dictionaries";
import type { ReaderBook } from "@/lib/books/reader";
import type { ReaderLabels } from "./Reader";

/** Precomputes reader labels (dictionary functions can't cross into client components). */
export function readerLabels(d: Dictionary, book: ReaderBook): ReaderLabels {
  const r = d.reader;
  const storyCount = book.pages.filter((p) => p.kind === "story").length;
  return {
    back: r.back, prev: r.prev, next: r.next, theEnd: r.theEnd, contents: r.contents, fullscreen: r.fullscreen, exitFullscreen: r.exitFullscreen,
    title: book.title,
    pageLabels: book.pages.map((p) =>
      p.kind === "front_cover" ? r.cover : p.kind === "back_cover" ? r.backCover : p.kind === "dedication" ? r.dedication : r.pageOf(p.pageNumber ?? 0, storyCount)),
  };
}
