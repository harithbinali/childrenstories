/** Idempotency key for a book's PDF render: one render per (story version, number of paid redraws). */
export const pdfJobKey = (bookId: string, version: number, redraws: number) => `pdf:${bookId}:v${version}:r${redraws}`;
