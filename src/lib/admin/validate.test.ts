import { describe, expect, it } from "vitest";
import { isInternalHref, parseFaqs, validImageSize } from "./validate";

describe("admin validation", () => {
  it("accepts only page-ratio image sizes", () => {
    expect(validImageSize("1024x1536", "portrait")).toBe(true);
    expect(validImageSize("1536x1024", "landscape")).toBe(true);
    expect(validImageSize("2048x3072", "portrait")).toBe(true);
    expect(validImageSize("1024x1024", "portrait")).toBe(false);
    expect(validImageSize("1536x1024", "portrait")).toBe(false);
    expect(validImageSize("1000x1500", "portrait")).toBe(false); // not a multiple of 16
    expect(validImageSize("4096x6144", "portrait")).toBe(false);
    expect(validImageSize("1024×1536", "portrait")).toBe(false);
  });

  it("parses FAQ blocks and drops incomplete ones", () => {
    expect(parseFaqs("How long?\nA few minutes.\n\nCan I edit?\nYes,\nany page.\n\nOrphan question")).toEqual([
      { q: "How long?", a: "A few minutes." },
      { q: "Can I edit?", a: "Yes, any page." },
    ]);
    expect(parseFaqs("Q\r\nA\r\n\r\nQ2\r\nA2")).toHaveLength(2);
  });

  it("only allows internal banner links", () => {
    expect(isInternalHref("/pricing")).toBe(true);
    expect(isInternalHref("/themes?x=1#top")).toBe(true);
    expect(isInternalHref("//evil.example")).toBe(false);
    expect(isInternalHref("https://evil.example")).toBe(false);
    expect(isInternalHref("javascript:alert(1)")).toBe(false);
  });
});
