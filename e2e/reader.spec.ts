import { expect, test } from "@playwright/test";
import { useLocale, watchErrors } from "./helpers";

// The reader preview renders a finished sample book (no database needed).
test.describe("tablet reader", () => {
  test("turns pages with keys, buttons and the contents drawer", async ({ page, context, baseURL }) => {
    await useLocale(context, baseURL!, "en");
    const check = watchErrors(page);
    await page.goto("/design-system/preview/reader-cover");
    const label = page.locator("[aria-live=polite]");
    await expect(label).toHaveText("Cover");
    // Pages render once the client has measured the stage (i.e. after hydration).
    await expect(page.locator("[data-page-kind]").first()).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(label).not.toHaveText("Cover");
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(label).toHaveText("Cover");
    await page.getByRole("button", { name: "All pages" }).click();
    await page.getByRole("navigation", { name: "All pages" }).getByRole("button").last().click();
    await expect(label).toHaveText("Back cover");
    await expect(page.getByRole("link", { name: "The end" })).toBeVisible();
    check();
  });

  test("Arabic books read right to left", async ({ page, context, baseURL }) => {
    await useLocale(context, baseURL!, "ar");
    await page.goto("/design-system/preview/reader-cover");
    const label = page.locator("[aria-live=polite]");
    await expect(page.locator("[data-page-kind]").first()).toBeVisible();
    await page.keyboard.press("ArrowRight"); // backwards in RTL: stays on the cover
    await expect(label).toHaveText("الغلاف");
    await page.keyboard.press("ArrowLeft"); // forwards in RTL
    await expect(label).not.toHaveText("الغلاف");
  });
});
