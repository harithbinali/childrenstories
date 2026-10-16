/**
 * Server-side order pricing. Amounts are integer minor units (cents). The
 * browser never supplies a price — only a product id and optional code.
 */

export type Product = { id: string; price_amount: number; currency: string; is_active: boolean; page_count: number };

export type DiscountCode = {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export type DiscountRejection = "inactive" | "not_started" | "expired" | "exhausted" | "currency_mismatch";

export type OrderTotals = {
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  discountCodeId: string | null;
  discountRejected: DiscountRejection | null;
};

export function checkDiscount(d: DiscountCode, currency: string, now: Date): DiscountRejection | null {
  if (!d.is_active) return "inactive";
  if (d.starts_at && new Date(d.starts_at) > now) return "not_started";
  if (d.expires_at && new Date(d.expires_at) <= now) return "expired";
  if (d.max_redemptions !== null && d.redeemed_count >= d.max_redemptions) return "exhausted";
  if (d.amount_off !== null && d.currency?.toUpperCase() !== currency.toUpperCase()) return "currency_mismatch";
  return null;
}

export function computeOrderTotals(product: Product, discount: DiscountCode | null, now = new Date()): OrderTotals {
  if (!product.is_active) throw new Error("product is not available");
  if (!Number.isInteger(product.price_amount) || product.price_amount < 0) throw new Error("invalid product price");
  const subtotal = product.price_amount;
  let amount = 0;
  let rejected: DiscountRejection | null = null;
  if (discount) {
    rejected = checkDiscount(discount, product.currency, now);
    if (!rejected) {
      amount = discount.percent_off !== null ? Math.round((subtotal * discount.percent_off) / 100) : (discount.amount_off ?? 0);
      amount = Math.min(amount, subtotal);
    }
  }
  return {
    currency: product.currency.toUpperCase(),
    subtotal,
    discount: amount,
    total: subtotal - amount,
    discountCodeId: discount && !rejected ? discount.id : null,
    discountRejected: rejected,
  };
}

/** Format minor units for display, e.g. 1900 USD -> "$19.00". */
export function formatMoney(amount: number, currency: string, locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", { style: "currency", currency }).format(amount / 100);
}
