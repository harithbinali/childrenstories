import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateImage } from "./validate-image";

const fx = (n: string) => new Uint8Array(readFileSync(join(__dirname, "__fixtures__", n)));

describe("validateImage", () => {
  it.each([
    ["photo.jpg", "image/jpeg", 640, 480],
    ["photo.png", "image/png", 512, 700],
    ["photo-lossy.webp", "image/webp", 800, 600],
    ["photo-lossless.webp", "image/webp", 800, 600],
  ])("accepts %s and reads true dimensions", (file, mime, w, h) => {
    expect(validateImage(fx(file))).toMatchObject({ ok: true, mimeType: mime, width: w, height: h });
  });

  it("rejects truncated files", () => {
    expect(validateImage(fx("truncated.jpg"))).toEqual({ ok: false, reason: "corrupt" });
  });

  it("rejects images too small to recognise a face", () => {
    expect(validateImage(fx("tiny.png"))).toEqual({ ok: false, reason: "dimensions_too_small" });
  });

  it("rejects non-images regardless of claimed type", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>".repeat(100));
    expect(validateImage(html)).toEqual({ ok: false, reason: "unsupported_format" });
  });

  it("rejects oversized uploads before parsing", () => {
    expect(validateImage(new Uint8Array(11 * 1024 * 1024))).toEqual({ ok: false, reason: "too_large" });
  });
});
