import { describe, expect, it } from "vitest";
import { negotiateLocale, num } from "./config";

describe("i18n config", () => {
  it("negotiates by quality and falls back to English", () => {
    expect(negotiateLocale("ar-SA,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(negotiateLocale("fr-FR,en;q=0.5,ar;q=0.9")).toBe("ar");
    expect(negotiateLocale("de-DE")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
  it("uses Eastern Arabic numerals in Arabic", () => {
    expect(num(12, "ar")).toBe("١٢");
    expect(num("8–16", "ar")).toBe("٨–١٦");
    expect(num(12, "en")).toBe("12");
  });
});
