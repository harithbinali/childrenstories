import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripMetadata } from "./strip-metadata";
import { validateImage } from "./validate-image";

const fx = (n: string) => new Uint8Array(readFileSync(join(__dirname, "__fixtures__", n)));
const has = (b: Uint8Array, s: string) => Buffer.from(b).includes(Buffer.from(s, "latin1"));

describe("stripMetadata", () => {
  it.each([
    ["with-exif.jpg", "image/jpeg", "Exif", "SecretCam"],
    ["with-text.png", "image/png", "tEXt", "Secret St"],
    ["with-exif.webp", "image/webp", "EXIF", "SecretCam"],
  ] as const)("removes metadata from %s and keeps a valid image", (file, mime, marker, secret) => {
    const input = fx(file);
    expect(has(input, secret)).toBe(true);
    const out = stripMetadata(input, mime);
    expect(has(out, marker)).toBe(false);
    expect(has(out, secret)).toBe(false);
    const before = validateImage(input);
    const after = validateImage(out);
    expect(after).toMatchObject({ ok: true, mimeType: mime });
    if (before.ok && after.ok) expect([after.width, after.height]).toEqual([before.width, before.height]);
    expect(out.length).toBeLessThan(input.length);
  });

  it("leaves metadata-free images byte-identical", () => {
    const png = fx("photo.png");
    expect(Buffer.from(stripMetadata(png, "image/png")).equals(Buffer.from(png))).toBe(true);
  });
});
