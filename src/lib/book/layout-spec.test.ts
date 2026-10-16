import { describe, expect, it } from "vitest";
import { IMAGE_SIZE, TRIM, aspectRatio, buildPageSequence, buildSpreads, fitPage, shouldUseSpreads, textRegion } from "./layout-spec";

describe("layout spec", () => {
  it("page aspect ratio equals illustration aspect ratio (no crop, no stretch)", () => {
    for (const o of ["portrait", "landscape"] as const) {
      const [w, h] = IMAGE_SIZE[o].split("x").map(Number);
      expect(w / h).toBeCloseTo(TRIM[o].width / TRIM[o].height, 6);
    }
    expect(aspectRatio("portrait")).toBeLessThan(1);
    expect(aspectRatio("landscape")).toBeGreaterThan(1);
  });

  it("page count counts story pages only; covers and dedication are extra", () => {
    const seq = buildPageSequence(8, true);
    expect(seq).toHaveLength(8 + 3);
    expect(seq[0].kind).toBe("front_cover");
    expect(seq[1].kind).toBe("dedication");
    expect(seq.filter((p) => p.kind === "story").map((p) => p.storyPageNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(seq.at(-1)!.kind).toBe("back_cover");
    expect(buildPageSequence(12, false)).toHaveLength(14);
    expect(() => buildPageSequence(10, false)).toThrow();
  });

  it("spreads keep the cover alone and mirror order for Arabic", () => {
    const seq = buildPageSequence(8, false); // cover + 8 + back = 10
    const en = buildSpreads(seq, "en");
    expect(en[0].map((p) => p.kind)).toEqual(["front_cover"]);
    expect(en[1].map((p) => p.storyPageNumber)).toEqual([1, 2]);
    const ar = buildSpreads(seq, "ar");
    expect(ar[1].map((p) => p.storyPageNumber)).toEqual([2, 1]);
    expect(en.flat()).toHaveLength(seq.length);
  });

  it("start/end text columns mirror in RTL and stay inside the page", () => {
    const en = textRegion("landscape", "start", "en");
    const ar = textRegion("landscape", "start", "ar");
    expect(en.x).toBeLessThan(0.5);
    expect(ar.x).toBeGreaterThan(0.5);
    for (const r of [en, ar, textRegion("portrait", "bottom", "en"), textRegion("portrait", "top", "ar")]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(1);
      expect(r.y + r.height).toBeLessThanOrEqual(1);
    }
  });

  it("fits pages inside the viewport without cropping", () => {
    const f = fitPage("portrait", { width: 768, height: 1024 });
    expect(f.width).toBeLessThanOrEqual(768);
    expect(f.height).toBeLessThanOrEqual(1024);
    expect(f.width / f.height).toBeCloseTo(2 / 3, 6);
  });

  it("uses spreads on a landscape iPad for portrait books but not on a phone", () => {
    expect(shouldUseSpreads("portrait", { width: 1180, height: 820 })).toBe(true);
    expect(shouldUseSpreads("portrait", { width: 390, height: 844 })).toBe(false);
    expect(shouldUseSpreads("landscape", { width: 1180, height: 820 })).toBe(false);
  });
});
