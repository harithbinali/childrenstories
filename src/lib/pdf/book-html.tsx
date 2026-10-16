import { renderToStaticMarkup } from "react-dom/server";
import { BookPage, type BookPageProps } from "@/components/book/BookPage";
import { TRIM, type Orientation } from "@/lib/book/layout-spec";

export type PdfFont = { family: string; weight: string; style?: string; dataUrl: string };

/**
 * A self-contained HTML document (fonts + images inlined as data URLs) where
 * each BookPage is exactly one print page. Rendered to PDF by Chromium,
 * which provides correct Arabic shaping, bidi and font embedding.
 */
export function buildBookHtml(args: { orientation: Orientation; language: "en" | "ar"; title: string; pages: BookPageProps[]; fonts: PdfFont[] }): string {
  const { width, height } = TRIM[args.orientation];
  const fontCss = args.fonts
    .map((f) => `@font-face{font-family:"${f.family}";src:url(${f.dataUrl}) format("truetype");font-weight:${f.weight};font-style:${f.style ?? "normal"};font-display:block;}`)
    .join("\n");
  const body = args.pages
    .map((p) => `<div class="sheet">${renderToStaticMarkup(<BookPage {...p} />)}</div>`)
    .join("\n");
  return `<!doctype html>
<html lang="${args.language}" dir="${args.language === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(args.title)}</title>
<style>
${fontCss}
@page { size: ${width}pt ${height}pt; margin: 0; }
html, body { margin: 0; padding: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { width: ${width}pt; height: ${height}pt; overflow: hidden; break-after: page; page-break-after: always; }
.sheet:last-child { break-after: auto; page-break-after: auto; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
