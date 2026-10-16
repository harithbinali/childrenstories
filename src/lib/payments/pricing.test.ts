import { describe, expect, it } from "vitest";
import { computeOrderTotals, type DiscountCode, type Product } from "./pricing";

const product: Product = { id: "p", price_amount: 2400, currency: "usd", is_active: true, page_count: 12 };
const code = (o: Partial<DiscountCode>): DiscountCode => ({
  id: "d", code: "HELLO", percent_off: null, amount_off: null, currency: null, max_redemptions: null,
  redeemed_count: 0, starts_at: null, expires_at: null, is_active: true, ...o,
});
const now = new Date("2026-10-16T00:00:00Z");

describe("computeOrderTotals", () => {
  it("charges the catalog price with no discount", () => {
    expect(computeOrderTotals(product, null, now)).toEqual({ currency: "USD", subtotal: 2400, discount: 0, total: 2400, discountCodeId: null, discountRejected: null });
  });
  it("applies percentage discounts with rounding", () => {
    expect(computeOrderTotals({ ...product, price_amount: 1999 }, code({ percent_off: 15 }), now)).toMatchObject({ discount: 300, total: 1699 });
  });
  it("never discounts below zero", () => {
    expect(computeOrderTotals(product, code({ amount_off: 5000, currency: "USD" }), now)).toMatchObject({ discount: 2400, total: 0 });
  });
  it.each([
    [{ percent_off: 10, is_active: false }, "inactive"],
    [{ percent_off: 10, expires_at: "2026-10-15T00:00:00Z" }, "expired"],
    [{ percent_off: 10, starts_at: "2026-11-01T00:00:00Z" }, "not_started"],
    [{ percent_off: 10, max_redemptions: 5, redeemed_count: 5 }, "exhausted"],
    [{ amount_off: 500, currency: "EUR" }, "currency_mismatch"],
  ] as const)("rejects invalid discount %o", (o, reason) => {
    expect(computeOrderTotals(product, code(o), now)).toMatchObject({ discount: 0, total: 2400, discountRejected: reason, discountCodeId: null });
  });
  it("refuses inactive products", () => {
    expect(() => computeOrderTotals({ ...product, is_active: false }, null, now)).toThrow();
  });
});
