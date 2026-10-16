/** Number of minor-unit digits for a currency (USD 2, JPY 0, KWD 3). */
export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

/** 1900 USD -> "19.00"; 1900 JPY -> "1900"; 1500 KWD -> "1.500" */
export function toDecimalString(minor: number, currency: string): string {
  if (!Number.isInteger(minor)) throw new Error("amount must be integer minor units");
  const d = currencyDigits(currency);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor).toString().padStart(d + 1, "0");
  return d === 0 ? sign + abs : `${sign}${abs.slice(0, -d)}.${abs.slice(-d)}`;
}

/** "19.00" USD -> 1900. Rejects more precision than the currency allows. */
export function fromDecimalString(value: string, currency: string): number {
  const d = currencyDigits(currency);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) throw new Error(`invalid amount "${value}"`);
  const frac = (m[3] ?? "").replace(/0+$/, "");
  if (frac.length > d) throw new Error(`too many decimals for ${currency}: ${value}`);
  const n = Number(m[2]) * 10 ** d + Number((frac + "0".repeat(d)).slice(0, d) || 0);
  return m[1] ? -n : n;
}
