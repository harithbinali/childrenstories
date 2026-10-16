/**
 * Runtime guard for modules shared by Next.js server code, the background
 * worker and tests. (`server-only` cannot be used there because it throws
 * outside Next's server bundler.)
 */
if (typeof window !== "undefined") {
  throw new Error("This module contains server secrets and must never be bundled for the browser.");
}
export {};
