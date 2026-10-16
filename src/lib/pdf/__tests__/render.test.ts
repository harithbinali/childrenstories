import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildBookHtml } from "../book-html";
import { renderPdf } from "../render";
import { buildPageSequence } from "@/lib/book/layout-spec";

const root = join(__dirname, "../../../..");
const font = (f: string) => `data:font/ttf;base64,${readFileSync(join(root, "public/fonts/provisional", f)).toString("base64")}`;
const img = (f: string) => `data:image/png;base64,${readFileSync(join(root, "src/lib/uploads/__fixtures__", f)).toString("base64")}`;
const hasChromium = Boolean(process.env.CHROMIUM_PATH);

describe.runIf(hasChromium)("PDF rendering (Chromium)", () => {
  it.each(["portrait", "landscape"] as const)("renders an Arabic %s book with exact trim size and one PDF page per book page", async (orientation) => {
    const seq = buildPageSequence(8, true);
    const pages = seq.map((p) =>
      p.kind === "front_cover"
        ? { kind: p.kind, orientation, language: "ar" as const, ageRange: "3-5" as const, title: "مغامرة لينا في الفضاء", imageUrl: img("photo.png") }
        : p.kind === "story"
          ? { kind: p.kind, orientation, language: "ar" as const, ageRange: "3-5" as const, text: "نظرت لينا إلى السماء وابتسمت، فقد كانت النجوم تتلألأ كأنها تدعوها إلى مغامرة جديدة.", textPosition: orientation === "portrait" ? ("bottom" as const) : ("start" as const), pageNumber: p.storyPageNumber, imageUrl: img("photo.png") }
          : { kind: p.kind, orientation, language: "ar" as const, ageRange: "3-5" as const, text: p.kind === "dedication" ? "إلى لينا، بكل الحب" : "النهاية" },
    );
    const html = buildBookHtml({
      orientation, language: "ar", title: "test", pages,
      fonts: [
        { family: "Noto Naskh Arabic", weight: 400, dataUrl: font("NotoNaskhArabic-Regular.ttf") },
        { family: "Noto Naskh Arabic", weight: 700, dataUrl: font("NotoNaskhArabic-Bold.ttf") },
      ],
    });
    const pdf = await renderPdf(html, orientation);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(seq.length);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual(orientation === "portrait" ? [576, 864] : [864, 576]);

    if (process.env.PDF_TEST_OUT) {
      mkdirSync(process.env.PDF_TEST_OUT, { recursive: true });
      writeFileSync(join(process.env.PDF_TEST_OUT, `arabic-${orientation}.pdf`), pdf);
    }
  }, 60_000);
});
