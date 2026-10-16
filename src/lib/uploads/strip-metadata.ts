/**
 * Removes embedded metadata (EXIF incl. GPS location, XMP, comments, text
 * chunks) from uploaded child photos before they are stored. Pixel data is
 * untouched. Colour profiles (ICC) are kept so colours stay correct.
 */
import type { ImageFormat } from "./validate-image";

export function stripMetadata(bytes: Uint8Array, format: ImageFormat): Uint8Array {
  if (format === "image/jpeg") return stripJpeg(bytes);
  if (format === "image/png") return stripPng(bytes);
  return stripWebp(bytes);
}

/** JPEG: drop APP1 (EXIF/XMP), APP3–APP15 and COM segments; keep APP0 (JFIF) and APP2 (ICC). */
function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let o = 2;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) break;
    const marker = b[o + 1];
    if (marker === 0xda) { // start of scan: the rest is image data
      out.push(b.subarray(o));
      return concat(out);
    }
    const len = (b[o + 2] << 8) | b[o + 3];
    const end = o + 2 + len;
    const drop = marker === 0xe1 || (marker >= 0xe3 && marker <= 0xef) || marker === 0xfe;
    if (!drop) out.push(b.subarray(o, end));
    o = end;
  }
  out.push(b.subarray(o));
  return concat(out);
}

const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

/** PNG: drop eXIf and text/time chunks. */
function stripPng(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 8)];
  let o = 8;
  while (o + 12 <= b.length) {
    const len = ((b[o] << 24) >>> 0) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
    const type = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);
    const end = o + 12 + len;
    if (!PNG_DROP.has(type)) out.push(b.subarray(o, end));
    o = end;
    if (type === "IEND") break;
  }
  return concat(out);
}

/** WebP (RIFF): drop EXIF and XMP chunks and clear their flags in VP8X. */
function stripWebp(b: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let o = 12;
  while (o + 8 <= b.length) {
    const type = String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
    const size = b[o + 4] | (b[o + 5] << 8) | (b[o + 6] << 16) | (b[o + 7] << 24);
    const end = o + 8 + size + (size % 2);
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = b.slice(o, Math.min(end, b.length));
      if (type === "VP8X") chunk[8] &= ~(0x08 | 0x04); // EXIF and XMP presence flags
      chunks.push(chunk);
    }
    o = end;
  }
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 12));
  const riffSize = body.length + 4;
  header[4] = riffSize & 0xff;
  header[5] = (riffSize >> 8) & 0xff;
  header[6] = (riffSize >> 16) & 0xff;
  header[7] = (riffSize >> 24) & 0xff;
  return concat([header, body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
