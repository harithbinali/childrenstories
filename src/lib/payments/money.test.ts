import { describe, expect, it } from "vitest";
import { fromDecimalString, toDecimalString } from "./money";

describe("money conversion", () => {
  it.each([
    [1900, "USD", "19.00"], [5, "USD", "0.05"], [1900, "JPY", "1900"], [1500, "KWD", "1.500"], [0, "EUR", "0.00"],
  ])("%i %s <-> %s", (minor, cur, dec) => {
    expect(toDecimalString(minor, cur)).toBe(dec);
    expect(fromDecimalString(dec, cur)).toBe(minor);
  });
  it("rejects precision beyond the currency", () => {
    expect(() => fromDecimalString("19.001", "USD")).toThrow();
    expect(() => toDecimalString(19.5, "USD")).toThrow();
  });
});
