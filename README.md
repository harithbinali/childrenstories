# Storyling

AI-personalized children's storybooks: parents upload a photo, approve an illustrated
character, and create a private, illustrated book (English or Arabic, portrait or
landscape) to read on a tablet or download as a PDF.

> Brand name is configurable (`platform_settings.brand.name`, `NEXT_PUBLIC_BRAND_NAME`).

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS)
· OpenAI API · Stripe + PayPal · Resend · Postgres-backed job queue + Docker worker
(Chromium for PDFs) · Vercel

## Docs
- [Architecture & decisions](docs/ARCHITECTURE.md)
- [Setup & deployment](docs/SETUP.md)
- [Implementation checklist & known limitations](docs/IMPLEMENTATION_CHECKLIST.md)

## Layout
```
src/app/            routes (web app, webhooks, cron)
src/components/     UI (book/BookPage.tsx is shared by reader and PDF)
src/lib/ai          OpenAI runtime, story, images, moderation, cost
src/lib/jobs        durable job queue runner + handlers
src/lib/payments    pricing, gateways (Stripe/PayPal), webhooks, checkout, refunds
src/lib/book        layout spec, fonts, book loader
src/lib/limits      generation limit policy + enforcement
supabase/migrations SQL schema, RLS, transactional functions, seed data
supabase/tests      DB tests (RLS, payments, jobs) against a Supabase shim
worker/             background worker entry + Dockerfile
scripts/            character-consistency proof of concept
```

## Quick start
```bash
pnpm install && cp .env.example .env.local
pnpm dev        # web
pnpm worker     # jobs
pnpm test && pnpm test:db
```
