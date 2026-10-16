import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "./cost";

describe("estimateCostUsd", () => {
  it("returns null when no pricing is configured", () => {
    expect(estimateCostUsd(null, { inputTokens: 1000 })).toBeNull();
    expect(estimateCostUsd({}, { inputTokens: 1000 })).toBeNull();
  });
  it("computes token-based text cost", () => {
    expect(estimateCostUsd({ input_per_1m: 2, output_per_1m: 8 }, { inputTokens: 500_000, outputTokens: 100_000 })).toBe(1.8);
  });
  it("uses flat per-image pricing when available", () => {
    expect(
      estimateCostUsd({ per_image: { high: { "1024x1536": 0.2 } } }, { imageCount: 3, imageQuality: "high", imageSize: "1024x1536" }),
    ).toBe(0.6);
  });
  it("is unknown when images were made but no image price exists", () => {
    expect(estimateCostUsd({ input_per_1m: 2 }, { imageCount: 1, imageQuality: "high", imageSize: "1024x1536" })).toBeNull();
  });
});
