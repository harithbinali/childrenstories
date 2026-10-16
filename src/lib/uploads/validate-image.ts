/**
 * Validates an uploaded image from its bytes. The client-supplied MIME type
 * and file name are never trusted: the format is detected from magic bytes
 * and the dimensions are parsed from the file headers.
 */

export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";

export type ImageValidation =
  | { ok: true; mimeType: ImageFormat; width: number; height: number; sizeBytes: number; extension: "jpg" | "png" | "webp" }
  | { ok: false; reason: "too_large" | "too_small" | "unsupported_format" | "corrupt" | "dimensions_too_small" | "dimensions_too_large" };

export const PHOTO_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  minBytes: 1024,
  minDimension: 256,
  maxDimension: 12000,
} as const;

export function detectFormat(b: Uint8Array): ImageFormat | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return "image/png";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  return null;
}

function ascii(b: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...b.subarray(start, start + len));
}

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);

export function readDimensions(b: Uint8Array, format: ImageFormat): { width: number; height: number } | null {
  try {
    if (format === "image/png") {
      if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
      return { width: u32be(b, 16), height: u32be(b, 20) };
    }
    if (format === "image/webp") {
      const chunk = ascii(b, 12, 4);
      if (chunk === "VP8X" && b.length >= 30) return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
      if (chunk === "VP8 " && b.length >= 30) return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
      if (chunk === "VP8L" && b.length >= 25) {
        const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
    // JPEG: walk segments to the first SOFn marker.
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) return null;
      const marker = b[o + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        o += 2;
        continue;
      }
      const len = u16be(b, o + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) return { height: u16be(b, o + 5), width: u16be(b, o + 7) };
      if (len < 2) return null;
      o += 2 + len;
    }
    return null;
  } catch {
    return null;
  }
}

/** JPEG/PNG must also be complete files (truncated uploads are rejected). */
function hasValidTrailer(b: Uint8Array, format: ImageFormat): boolean {
  if (format === "image/jpeg") {
    // allow trailing padding after EOI
    for (let i = b.length - 2; i >= Math.max(0, b.length - 4096); i--) if (b[i] === 0xff && b[i + 1] === 0xd9) return true;
    return false;
  }
  if (format === "image/png") return ascii(b, b.length - 8, 4) === "IEND";
  // WebP: RIFF size must match the file
  const riffSize = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  return riffSize + 8 <= b.length;
}

export function validateImage(bytes: Uint8Array, limits = PHOTO_LIMITS): ImageValidation {
  if (bytes.length > limits.maxBytes) return { ok: false, reason: "too_large" };
  if (bytes.length < limits.minBytes) return { ok: false, reason: "too_small" };
  const mimeType = detectFormat(bytes);
  if (!mimeType) return { ok: false, reason: "unsupported_format" };
  const dims = readDimensions(bytes, mimeType);
  if (!dims || !hasValidTrailer(bytes, mimeType)) return { ok: false, reason: "corrupt" };
  if (Math.min(dims.width, dims.height) < limits.minDimension) return { ok: false, reason: "dimensions_too_small" };
  if (Math.max(dims.width, dims.height) > limits.maxDimension) return { ok: false, reason: "dimensions_too_large" };
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  return { ok: true, mimeType, ...dims, sizeBytes: bytes.length, extension };
}
