# Storyling — Architecture & Decisions

## System overview

```
Browser ──► Next.js 16 on Vercel (App Router, Server Actions, Route Handlers)
              │  proxy.ts: refreshes Supabase session, optimistic redirects
              │  lib/auth/guards.ts: real authorization (DAL)
              ▼
         Supabase ── Postgres (RLS on every table) · Auth · private Storage
              ▲
              │ leases jobs (claim_generation_jobs, SKIP LOCKED)
         Worker (Node, Docker, Playwright image) ──► OpenAI API
              │                                     (text, images, moderation)
              └─► Chromium (PDF) · Resend (email)

Stripe / PayPal ──webhooks──► /api/webhooks/* ──► mark_order_paid() ──► production job
```

## Key decisions

### ADR-1 Postgres-backed durable job queue
AI generation takes seconds to minutes and must survive the parent closing the tab.
Jobs live in `generation_jobs`; workers lease them with `claim_generation_jobs`
(`FOR UPDATE SKIP LOCKED`), heartbeat to extend the lease, and finish through
`complete_generation_job` / `fail_generation_job`. A crashed worker's jobs are recovered
when their lease expires. Retryable failures back off exponentially; permanent failures
(bad input, policy, limits) fail immediately. `idempotency_key` makes every enqueue
safe to repeat. No extra infrastructure (Redis, SQS) is needed, and job state is
queryable by the UI and admin dashboard with RLS.

Workers only claim job types they have handlers for: the Vercel Cron route runs short
text/email/orchestration jobs; the Docker worker runs everything, including image
generation and Chromium PDF rendering.

### ADR-2 Authorization in three layers
1. `proxy.ts` — session refresh + optimistic redirect only (never trusted alone).
2. `lib/auth/guards.ts` — `requireUser` / `requireStaff` / `requireAdmin` in every
   server action and page (Data Access Layer).
3. Row Level Security — parents read only their rows; direct writes allowed only where no
   business rule applies. Everything else is written with the service role after
   validation. Staff/admins cannot read child photos at all (rows or files).
Roles live in `user_roles` and can only be changed by the service role, so a parent can't
escalate privileges even with a crafted request (tested).

### ADR-3 Payments are confirmed only by the database function `mark_order_paid`
Prices come from `book_products` on the server; the browser sends ids only. A verified
webhook (or PayPal's server-side capture response) calls `mark_order_paid`, which in one
transaction: checks amount + currency, records the payment, marks the order paid, grants
the entitlement, and enqueues production with an idempotency key. Duplicate and concurrent
webhooks are no-ops (tested). Payments on superseded checkouts are honoured; a second
payment for an already-paid book is recorded and flagged for refund. Orders, payments,
refunds and audit logs cannot be deleted.

### ADR-4 Book layout: page shape = illustration shape
Portrait books are 2:3 (8×12 in), landscape 3:2 (12×8 in), exactly matching the image
sizes the model produces (1024×1536 / 1536×1024). Art is never cropped to fit a different
page or stretched between orientations. Story text is not drawn into images: each page
reserves a text region that the illustration prompt keeps calm, and text is typeset over
it. One component (`components/book/BookPage.tsx`) renders pages for both the reader and
the PDF, with sizes in page-relative units so a tablet and a printed page match.

### ADR-5 PDF via headless Chromium (not @react-pdf/renderer)
Arabic requires proper glyph shaping and bidi. React-PDF does not shape Arabic reliably;
Chromium (HarfBuzz) does, and embeds subsetted fonts. The worker builds a self-contained
HTML document from `BookPage` and prints it at exact trim size. Verified for portrait and
landscape Arabic books (see `src/lib/pdf/__tests__`).

### ADR-6 Character consistency strategy
1. The approved character reference image is passed to every scene generation
   (`images.edit`), with identity-preservation rules in the prompt.
2. A vision model writes a precise visual description of the approved character, added to
   every scene prompt.
3. The story model fixes one wardrobe for the whole book.
4. Final renders after payment pass the approved preview as a second reference so the
   composition the parent saw is kept.
Consistency is not guaranteed by the model; parents can regenerate individual pages
within an admin-configured allowance. The POC script measures consistency with an
automated vision judge plus human review.

### ADR-7 AI cost accounting
Every OpenAI call (success or failure) is logged to `ai_usage_logs` with tokens, image
count/size/quality, latency and an estimated cost from the admin-maintained price table.
When no price is configured the cost is stored as unknown (NULL), never guessed. Limits
(`lib/limits/policy.ts`) are enforced server-side before every enqueue; paid books are
always fulfilled even when platform spend caps are reached.

### ADR-8 Child photo privacy
Photos are validated by magic bytes and parsed dimensions (never by browser MIME type),
moderated, stored in a private bucket under the owner's id, served only via short-lived
signed URLs after an ownership check, and purged after a configurable retention period
(`retention.child_photo_days`). OpenAI calls use `store: false` where supported and a
hashed safety identifier instead of user ids. Staff cannot access photos.

### ADR-9 Admin dashboard access
`/admin` 404s for anyone who isn't staff. Reads run as the signed-in staff member, so RLS
still applies (no child photos, ever); cross-account aggregates and email lookups go
through `admin_*` security-definer functions that check `is_staff()` first. Writes are
server actions that re-check the role (`requireStaff` for jobs and support,
`requireAdmin` for money, catalog, configuration, suspensions and deletions), validate
with zod, write with the service role and append to `admin_audit_logs`. Secret keys
stay in environment variables: the dashboard only shows whether they are configured.
Account deletion runs after a 7-day grace period: private files, then the auth user
(rows cascade); orders are kept without the email address and the request row is kept
as a record.

## Data model (summary)
Identity: `profiles`, `user_roles` · Children: `child_profiles`, `child_photos` ·
Characters: `characters`, `character_references`, `illustration_styles` ·
Books: `story_themes`, `books`, `book_versions`, `book_pages`, `generated_illustrations`,
`reading_progress`, `book_entitlements` · Jobs/AI: `generation_jobs`,
`generation_attempts`, `ai_model_settings`, `ai_usage_logs` · Commerce: `book_products`,
`orders`, `order_items`, `payments`, `refunds`, `payment_webhook_events`,
`payment_gateway_configs`, `discount_codes` · Admin: `platform_settings`,
`marketing_content`, `support_tickets`, `support_messages`, `admin_audit_logs`,
`account_deletion_requests`, `email_log`, `rate_limit_counters`.

## Page count definition
"8 / 12 / 16 pages" counts **story pages only**. Front cover, optional dedication page and
back cover are added on top (an 8-page book with a dedication prints as 11 pages).
