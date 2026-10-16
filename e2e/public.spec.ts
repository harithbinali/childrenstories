import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, useLocale, watchErrors } from "./helpers";

const PAGES = ["/", "/how-it-works", "/themes", "/styles", "/examples", "/pricing", "/faq", "/about", "/contact", "/privacy", "/terms", "/refund-policy", "/child-photo-privacy", "/login", "/register", "/forgot-password"];

for (const locale of ["en", "ar"] as const) {
  test.describe(`public pages (${locale})`, () => {
    test.beforeEach(async ({ context, baseURL }) => useLocale(context, baseURL!, locale));

    for (const path of PAGES) {
      test(`${path} renders`, async ({ page }) => {
        const check = watchErrors(page);
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await expect(page.locator("h1").first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
        check();
      });
    }
  });
}

test("legal drafts highlight their placeholders", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("mark").filter({ hasText: "[COMPANY LEGAL NAME]" }).first()).toBeVisible();
});

test("the language toggle switches to Arabic", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Switch to Arabic" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("sitemap lists public pages only", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("/en/pricing");
  expect(xml).not.toMatch(/dashboard|admin|design-system/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /dashboard");
  expect(robots).toContain("Disallow: /admin");
});
