import { expect, type BrowserContext, type Page } from "@playwright/test";

export async function useLocale(context: BrowserContext, baseURL: string, locale: "en" | "ar") {
  await context.addCookies([{ name: "sl-locale", value: locale, url: baseURL }]);
}

/** Fails on uncaught errors and console errors (resource 4xx from tests themselves excluded). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
