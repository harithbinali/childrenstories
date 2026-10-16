# Storyling — Setup & Deployment

## 1. Local development

```bash
pnpm install
cp .env.example .env.local   # fill in values (see below)
pnpm dev                     # web app on http://localhost:3000
pnpm worker                  # background worker (separate terminal)
```

Tests:

```bash
pnpm lint && pnpm typecheck
pnpm test                                    # unit tests
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/postgres pnpm test:db   # migrations + RLS + payments
PDF_TESTS=1 pnpm test                        # also render PDFs (needs Playwright Chromium)
```

`pnpm test:db` creates a throw-away database, applies a small Supabase compatibility shim
(`supabase/tests/supabase_shim.sql`) and every migration, then tests RLS isolation,
privilege escalation, duplicate webhooks, refunds and job-queue recovery.

## 2. Supabase

1. Create a project. Copy URL, anon key and service-role key into env vars.
2. Apply migrations: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   (or run the files in `supabase/migrations/` in order in the SQL editor).
3. Auth > Providers: enable Email (confirm email ON). Optional: Google.
4. Auth > URL configuration: Site URL = your domain; add `https://<domain>/api/auth/callback`
   (and `http://localhost:3000/api/auth/callback` for development) to the redirect URLs.
5. Make yourself admin (SQL editor):
   `insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = 'you@example.com';`
6. Prices are seeded as USD 19 / 24 / 29 (confirmed); edit in Admin > Products.
7. Admin > AI Configuration: enter current OpenAI prices so cost reports are populated.

## 3. OpenAI
Create a project-scoped API key; set `OPENAI_API_KEY` (server and worker only).
Image generation with GPT Image models may require organization verification.

## 4. Stripe
Set `STRIPE_SECRET_KEY` (test mode outside production). Add a webhook endpoint
`https://<domain>/api/webhooks/stripe` with events: `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`checkout.session.expired`, `refund.created`, `refund.updated`, `refund.failed`.
Set `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## 5. PayPal
Create a REST app (sandbox first). Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
`PAYPAL_ENVIRONMENT`. Add webhook `https://<domain>/api/webhooks/paypal` for
`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`,
`PAYMENT.REFUND.*`; set `PAYPAL_WEBHOOK_ID`.

## 6. Email (Resend)
Verify your sending domain; set `RESEND_API_KEY` and `EMAIL_FROM`.
Auth emails (verify, reset, magic link, email change, invite, reauthentication) are sent by
Supabase Auth. Storyling-branded, bilingual templates are in `supabase/templates/`. Paste each
into Dashboard → Authentication → Emails → Templates (see `supabase/templates/README.md` for
the subjects). Until you do, Supabase's default emails are sent. Regenerate them after
changing `src/lib/email/layout.ts` with `npx tsx scripts/build-auth-email-templates.ts`.

## 7. Vercel (web app)
Import the GitHub repo, framework Next.js, set all env vars from `.env.example`
(except `TEST_DATABASE_URL`). `vercel.json` schedules `/api/cron/jobs` every 5 minutes
(needs a plan that allows that frequency) with `Authorization: Bearer $CRON_SECRET`.

## 8. Worker
Image generation and PDF rendering run in the worker, not in Vercel functions.
Deploy `worker/Dockerfile` (build from repo root) to Railway, Fly.io, Render, or any
container host, with the same env vars. Scale horizontally safely — jobs are leased.
Concurrency per process: Admin > Usage Limits > worker concurrency.

## 9. Backups & recovery
Enable Supabase PITR (point-in-time recovery) on the production project. Storage objects
are not covered by database backups: schedule a storage export (e.g. `rclone` to S3) for
`illustrations`, `character-refs` and `book-pdfs`. Purchased books are never auto-deleted.
