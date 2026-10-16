# Implementation Checklist

Legend: ✅ done & verified · 🟡 built, not yet verified against the live service · ⏳ not started · ⛔ blocked (external dependency)

"Verified" means exercised by an automated test or a real run — not merely written.

## Blockers needing the owner's action

| # | Blocker | Needed for |
|---|---------|-----------|
| B1 | Storyling Design System files/specs (the Claude Design link returns 403 from the build environment) | All UI work (Parts 3, 8, 10, 12–14, 19) |
| B2 | Environment secrets: Supabase, OpenAI, Stripe (test), PayPal (sandbox), Resend | Live verification of every integration |
| B3 | Network allowlist for the build environment: `api.openai.com`, `*.supabase.co`, `api.stripe.com`, `api-m.sandbox.paypal.com`, `api.resend.com`, `api.vercel.com` | Running the POC and integration tests from the build environment |
| B4 | Vercel project + worker host (Railway/Fly/Render) | Deployment |
| B5 | Business decisions: launch prices/currencies (seeded USD 19/24/29 are placeholders), support email, legal entity for policies | Pricing, legal pages |

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
| 23 | Transactional emails (bilingual, idempotent, no child images) | 🟡 · Storyling styling ⛔ B1 |
| 9 | Auth guards (DAL), proxy session refresh, roles | 🟡 · auth UI ⏳ (B1) |
| 3 | Storyling component library, tokens, `/design-system` | ⛔ B1 |
| 8 | Marketing website | ⛔ B1 |
| 10 | Parent dashboard | ⏳ (B1 for visuals; server actions next) |
| 12 | Storybook creator wizard | ⏳ (server pieces exist) |
| 14 | Tablet reader | ⏳ (`BookPage` + layout spec ready) |
| 16 | Permanent library, favorites, drafts | ⏳ (schema ready) |
| 19 | Admin dashboard | ⏳ |
| 23 | Support tickets UI | ⏳ (schema + RLS tested) |
| 26 | E2E tests (Playwright) | ⏳ |
| 27 | Vercel + worker deployment | ⛔ B4 |

## Known limitations (current)
- Illustrations are 1024×1536 / 1536×1024; at 8×12 in that is ~128 dpi — fine on screen,
  soft for professional print. Higher print resolution needs an upscaling step (not built).
- PDF is trim-size without bleed (digital/home printing). A print-shop variant with 0.125 in
  bleed is not built.
- Orders with a 100% discount (zero total) are rejected; free-book flows are not built.
- The provisional Arabic font (Noto Naskh Arabic, OFL) will be replaced by Storyling typography.
- Character consistency depends on the image model; regeneration allowances mitigate it.
