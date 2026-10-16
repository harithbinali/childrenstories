export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LegalDoc = { title: string; summary: string; sections: LegalSection[] };
export type LegalSlug = "privacy" | "terms" | "refunds" | "photoPrivacy";
export type LegalDocs = Record<LegalSlug, LegalDoc>;

/**
 * Text in [SQUARE BRACKETS] is a placeholder the operator must complete
 * (and have reviewed by a lawyer) before launch. The page highlights them.
 * Everything else describes how the product actually behaves — keep it in
 * sync with the code (retention, staff access, refunds, deletion).
 */
export const PLACEHOLDER = /(\[[A-Z0-9][A-Z0-9 ,./'&()-]*\])/g;
