import { expect, test } from "@playwright/test";

test.describe("signed-out visitors", () => {
  for (const path of ["/dashboard", "/dashboard/books", "/dashboard/settings", "/dashboard/books/00000000-0000-4000-8000-000000000000/read", "/admin", "/admin/customers", "/admin/settings"]) {
    test(`${path} goes to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("book PDFs need a session", async ({ request }) => {
    const res = await request.get("/api/books/00000000-0000-4000-8000-000000000000/pdf", { maxRedirects: 0 });
    expect([302, 303, 307, 401, 403, 404, 500]).toContain(res.status());
    expect(res.headers()["content-type"] ?? "").not.toContain("application/pdf");
  });

  test("webhooks reject unsigned requests", async ({ request }) => {
    for (const path of ["/api/webhooks/stripe", "/api/webhooks/paypal"]) {
      const res = await request.post(path, { data: { type: "checkout.session.completed" } });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test("the job runner requires the cron secret", async ({ request }) => {
    const res = await request.get("/api/cron/jobs");
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
