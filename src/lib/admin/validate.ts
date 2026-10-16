/** Pure validation helpers for admin forms (unit-tested). */

/** w×h, multiples of 16, ≤3840, and keeping the book's 2:3 (portrait) or 3:2 (landscape) page ratio. */
export function validImageSize(size: string, orientation: "portrait" | "landscape"): boolean {
  const m = /^(\d{3,4})x(\d{3,4})$/.exec(size);
  if (!m) return false;
  const [w, h] = [Number(m[1]), Number(m[2])];
  return w % 16 === 0 && h % 16 === 0 && w <= 3840 && h <= 3840 && (orientation === "portrait" ? w * 3 === h * 2 : w * 2 === h * 3);
}

/** FAQ editor format: blocks separated by a blank line; first line is the question, the rest the answer. */
export function parseFaqs(text: string, max = 20): Array<{ q: string; a: string }> {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => {
      const [q, ...a] = block.trim().split("\n");
      return { q: (q ?? "").trim(), a: a.map((x) => x.trim()).join(" ").trim() };
    })
    .filter((f) => f.q && f.a)
    .slice(0, max);
}

/** Banner links must stay on this site (no javascript:, no protocol-relative or external URLs). */
export function isInternalHref(href: string): boolean {
  return /^\/(?!\/)[\w\-/?=&#.%]*$/.test(href);
}
