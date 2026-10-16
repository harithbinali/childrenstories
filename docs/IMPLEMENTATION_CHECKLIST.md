# Implementation Checklist

Legend: ✅ done & verified · 🟡 built, not yet verified against the live service · ⏳ not started · ⛔ blocked (external dependency)

"Verified" means exercised by an automated test or a real run — not merely written.

## Blockers needing the owner's action

| # | Blocker | Needed for |
|---|---------|-----------|
| B2 | Environment secrets: Supabase + OpenAI (accounts exist, keys not yet added); Stripe, PayPal, Resend (accounts not yet created) | Live verification of every integration |
| B3 | Network allowlist for the build environment: `api.openai.com`, `*.supabase.co`, `api.stripe.com`, `api-m.sandbox.paypal.com`, `api.resend.com`, `api.vercel.com` | Running the POC and integration tests from the build environment |
| B4 | Vercel project + worker host (Railway/Fly/Render) | Deployment |
| B5 | Legal details (company name, address, support email, governing law) — policy pages use marked placeholders until supplied | Launch |

## Decisions recorded (2026-10-16)
- Design system: the owner's exported Storyling project (`design/storyling/`) is authoritative.
- Currency USD; launch prices $19 / $24 / $29 for 8 / 12 / 16 story pages.
- Legal pages ship with clearly marked placeholders.

## Status by part

| Part | Item | Status |
|------|------|--------|
| 5 | GitHub repo, `main` + `develop`, `.gitignore`, `.env.example`, CI workflow | ✅ |
| 6 | Schema (all Part 20 tables + webhook events, entitlements, rate limits, deletion requests, email log) | ✅ tested on PostgreSQL 16 |
| 6 | RLS on every table; cross-account isolation; staff can't read child photos; no privilege escalation | ✅ 44 DB tests |
| 6 | Private storage buckets + owner-path policies | ✅ policies tested via shim · 🟡 on real Supabase Storage |
| 6 | Real Supabase project connected | ⛔ B2/B3 |
| 7 | OpenAI runtime: admin-configured models, timeouts, retries/backoff, usage + cost logging | 🟡 |
| 7 | Story generation (structured outputs, validation, moderation) | 🟡 |
| 7 | Character + scene image generation, consistency strategy | 🟡 |
| 11 | Character-consistency POC script (`pnpm poc:characters`) | 🟡 script ready; run ⛔ B2/B3 |
| 15 | PDF: portrait + landscape, Arabic shaping, embedded fonts, exact trim | ✅ rendered & inspected (provisional font) |
| 13 | Shared layout spec: no crop/stretch, text regions, RTL mirroring, spreads | ✅ unit tests |
| 17 | Server-side pricing + discounts | ✅ unit tests |
| 17 | `mark_order_paid` / `record_refund`: idempotent, concurrent-safe, amount checks, superseded checkouts | ✅ DB tests |
| 17 | Stripe Checkout + webhook (signature verify, dedupe, retry-on-failure) | ✅ signature + mapping tests · 🟡 live sandbox |
| 17 | PayPal Orders + capture + webhook verification | 🟡 |
| 17 | Admin refunds (gateway + audit) | 🟡 |
| 18 | Limit policy (free attempts, previews, regenerations, daily/concurrency caps, spend cap that never blocks paid books) | ✅ unit tests · 🟡 DB loader |
| 21 | Durable job queue: leasing, retries/backoff, crash recovery, idempotency, per-attempt records | ✅ DB tests |
| 21 | Worker (N slots, graceful drain) + Vercel Cron fallback | 🟡 |
| 21 | Handlers: character, scene test, story, page rewrite (versioned), preview/final illustrations, production fan-out/fan-in, PDF, photo purge, email | 🟡 |
| 22 | Upload validation by magic bytes + parsed dimensions + truncation | ✅ tests with real JPG/PNG/WebP |
| 22 | DB-backed rate limiting | ✅ DB test |
| 22 | Audit log (append-only, immutable) | ✅ DB test |
| 23 | Transactional emails (bilingual, idempotent, no child images) | 🟡 · Storyling styling ⏳ |
| 9 | Auth guards (DAL), proxy session refresh, roles | 🟡 |
| 9 | Auth UI: login, register, forgot/reset password, verify email, callback route, optional Google | ✅ renders EN/AR at all sizes · 🟡 live sign-in (B2) |
| 3 | Storyling tokens (verbatim), self-hosted fonts + icons, 24 components ported to TSX, `/design-system` | ✅ screenshot-reviewed EN/AR, phone/tablet/desktop |
| 3 | i18n: locale routing (cookie / Accept-Language rewrite), EN + AR dictionaries, RTL | ✅ |
| 8 | Homepage (all 12 sections from the brief) | ✅ reviewed · illustrations are placeholders until generated (B2) |
| 8 | Other public pages (how it works, themes, styles, examples, pricing, FAQ, about, contact, legal) | ⏳ |
| 10 | Dashboard shell (sidebar / mobile tab bar) + overview (children, stats, bookshelf, activity, empty states) | ✅ reviewed via preview route · 🟡 live data (B2) |
| 10 | Children (+ photo upload), character studio, books, drafts, favourites | ✅ reviewed via preview routes · 🟡 live data (B2) |
| 10 | Orders (receipts, discounts, refunds), settings (profile, language, marketing opt-in, password change, account deletion with 7-day grace + cancel, sign out) | ✅ reviewed via preview routes · deletion/support rules DB-tested · 🟡 live data (B2) |
| 12 | Storybook creator wizard + book workspace (story editor, previews, checkout panel, production progress) | ✅ reviewed via preview routes · 🟡 live AI/payments (B2/B3) |
| 14 | Tablet reader: spreads/single pages, swipe/tap/keys (RTL-aware), auto-hiding controls, fullscreen, thumbnails, resume position | ✅ reviewed EN/AR phone/tablet/desktop + interaction script · 🟡 live data (B2) |
| 16 | Permanent library, favorites, drafts | ✅ pages built · 🟡 live data (B2) |
| 19 | Admin dashboard | ⏳ |
| 23 | Support tickets UI (list, new request linked to a book/order, conversation, reply, close) | ✅ reviewed via preview routes · RLS tested · staff side ships with the admin dashboard |
| 26 | E2E tests (Playwright) | ⏳ |
| 27 | Vercel + worker deployment | ⛔ B4 |

## Known limitations (current)
- Illustrations are 1024×1536 / 1536×1024; at 8×12 in that is ~128 dpi — fine on screen,
  soft for professional print. Higher print resolution needs an upscaling step (not built).
- PDF is trim-size without bleed (digital/home printing). A print-shop variant with 0.125 in
  bleed is not built.
- Orders with a 100% discount (zero total) are rejected; free-book flows are not built.
- Marketing and empty-state illustrations are Storyling BlobFrame placeholders until original art is generated with OpenAI.
- Character consistency depends on the image model; regeneration allowances mitigate it.
