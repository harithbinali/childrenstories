import "@/lib/server-guard";
import { chromium } from "playwright-core";
import { TRIM, type Orientation } from "@/lib/book/layout-spec";

/**
 * HTML -> PDF with headless Chromium. Runs in the background worker (not in
 * a Vercel function). CHROMIUM_PATH overrides the browser location.
 */
export async function renderPdf(html: string, orientation: Orientation): Promise<Uint8Array> {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 120_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const { width, height } = TRIM[orientation];
    // Playwright accepts px/in/cm/mm (not pt): 72pt = 1in.
    const pdf = await page.pdf({ width: `${width / 72}in`, height: `${height / 72}in`, printBackground: true, preferCSSPageSize: true });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
