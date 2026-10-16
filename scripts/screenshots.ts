/**
 * Visual review helper: screenshots pages at phone / tablet / desktop widths
 * in English and Arabic, and reports console errors and horizontal overflow.
 *
 *   BASE_URL=http://localhost:3000 OUT=./shots tsx scripts/screenshots.ts /design-system /
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.env.OUT ?? "shots";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
const viewports = (process.env.VIEWPORTS ?? "phone,tablet,desktop").split(",");
const SIZES: Record<string, { width: number; height: number }> = {
  phone: { width: 390, height: 844 },
  tablet: { width: 1024, height: 768 },
  "tablet-portrait": { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};
const locales = (process.env.LOCALES ?? "en,ar").split(",");

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  let problems = 0;
  for (const locale of locales) {
    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: SIZES[vp], reducedMotion: "reduce" });
      await ctx.addCookies([{ name: "sl-locale", value: locale, url: base }]);
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      for (const p of paths) {
        const res = await page.goto(base + p, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const name = `${p.replace(/\W+/g, "_") || "home"}-${locale}-${vp}.png`;
        await page.screenshot({ path: join(out, name), fullPage: process.env.FULL !== "0" });
        const status = res?.status();
        const flag = status !== 200 || overflow > 1 || errors.length;
        if (flag) problems++;
        console.log(`${flag ? "✖" : "✔"} ${p} [${locale} ${vp}] status=${status} overflow=${overflow}px${errors.length ? ` errors=${JSON.stringify(errors.slice(0, 3))}` : ""} -> ${name}`);
        errors.length = 0;
      }
      await ctx.close();
    }
  }
  await browser.close();
  process.exit(problems ? 1 : 0);
}
void main();
