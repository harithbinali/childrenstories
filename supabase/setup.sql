-- Storyling database setup — generated from supabase/migrations by scripts/build-supabase-setup-sql.ts.
-- Run once on a NEW Supabase project (Dashboard → SQL Editor → paste → Run). Do not edit by hand.

-- >>> 20261016000100_core_identity.sql
-- Storyling: core identity, roles and shared helpers
-- Conventions: uuid PKs, timestamptz, money stored as integer minor units,
-- every user-owned table carries owner_id for RLS.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('parent', 'staff', 'admin');
create type public.account_status as enum ('active', 'suspended', 'deletion_requested', 'deleted');
create type public.book_language as enum ('en', 'ar');
create type public.book_orientation as enum ('portrait', 'landscape');
create type public.job_status as enum ('queued', 'processing', 'completed', 'failed', 'cancelled');
create type public.payment_status as enum ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.payment_gateway as enum ('stripe', 'paypal');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- True when the current request runs with the service role (server-side code).
create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select coalesce(auth.role(), '') = 'service_role' or current_user in ('service_role', 'postgres', 'supabase_admin')
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  locale public.book_language not null default 'en',
  status public.account_status not null default 'active',
  guardian_attested_at timestamptz,            -- parent/guardian attestation for uploading child photos
  marketing_opt_in boolean not null default false,
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_status_idx on public.profiles(status);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles. Only the service role may grant/revoke (prevents privilege escalation).
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_role(p_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;

-- Admin or authorized staff
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'staff'))
$$;

-- Suspended / deleted accounts lose write access everywhere.
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
$$;

-- New auth user -> profile + parent role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'), 80),
    case when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar'::public.book_language else 'en'::public.book_language end
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'parent') on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Parents may edit their own profile but never their account status.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if public.is_service_role() then
    return new;
  end if;
  if new.status is distinct from old.status or new.suspended_reason is distinct from old.suspended_reason then
    raise exception 'profile status can only be changed by the platform' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_protect_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- >>> 20261016000200_catalog_children_books.sql
-- Storyling: admin-managed catalog, child profiles, characters and books

-- ---------------------------------------------------------------------------
-- Catalog (admin managed)
-- ---------------------------------------------------------------------------
create table public.illustration_styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  prompt_template text not null,            -- style instructions appended to image prompts
  preview_image_path text,                  -- public-assets bucket
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger illustration_styles_updated_at before update on public.illustration_styles
  for each row execute function public.set_updated_at();

create table public.story_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  prompt_guidance text not null default '', -- narrative guidance for the story model
  is_custom boolean not null default false, -- "Custom Story": parent supplies the idea
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  illustration_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger story_themes_updated_at before update on public.story_themes
  for each row execute function public.set_updated_at();

-- Page count = number of STORY pages. Front cover, dedication and back cover
-- are produced in addition and never count toward page_count.
create table public.book_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name_en text not null,
  name_ar text not null,
  page_count int not null check (page_count in (8, 12, 16)),
  price_amount int not null check (price_amount >= 0),  -- minor units
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  free_preview_pages int not null default 2 check (free_preview_pages >= 0),
  included_regenerations int not null default 10 check (included_regenerations >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index book_products_active_pages_currency_idx
  on public.book_products(page_count, currency) where is_active;
create trigger book_products_updated_at before update on public.book_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Children (minimal data by design)
-- ---------------------------------------------------------------------------
create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  age_years smallint check (age_years between 0 and 14),
  interests text[] not null default '{}' check (cardinality(interests) <= 12),
  preferred_language public.book_language not null default 'en',
  appearance_notes text check (char_length(appearance_notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index child_profiles_owner_idx on public.child_profiles(owner_id);
create trigger child_profiles_updated_at before update on public.child_profiles
  for each row execute function public.set_updated_at();

create table public.child_photos (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,        -- child-photos/{owner_id}/{child_id}/{id}.{ext}
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes > 0),
  width int,
  height int,
  sha256 text not null,
  guardian_attested_at timestamptz not null, -- attestation captured with each upload
  delete_after timestamptz,                  -- retention: originals purged after this
  created_at timestamptz not null default now()
);
create index child_photos_child_idx on public.child_photos(child_id);
create index child_photos_owner_idx on public.child_photos(owner_id);
create index child_photos_delete_after_idx on public.child_photos(delete_after) where delete_after is not null;
create unique index child_photos_dedupe_idx on public.child_photos(child_id, sha256);

-- ---------------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------------
create type public.character_status as enum ('generating', 'ready', 'approved', 'failed', 'archived');

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  style_id uuid not null references public.illustration_styles(id),
  name text not null check (char_length(name) between 1 and 60),
  status public.character_status not null default 'generating',
  correction_notes text check (char_length(correction_notes) <= 500),
  visual_description text,                  -- model-written description reused in scene prompts
  approved_reference_id uuid,               -- fk added below
  approved_at timestamptz,
  generation_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index characters_owner_idx on public.characters(owner_id);
create index characters_child_idx on public.characters(child_id);
create trigger characters_updated_at before update on public.characters
  for each row execute function public.set_updated_at();

create table public.character_references (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'portrait' check (kind in ('portrait', 'full_body', 'expression_sheet', 'scene_test')),
  storage_path text not null unique,        -- character-refs/{owner_id}/{character_id}/{id}.png
  prompt text not null,
  model text not null,
  width int,
  height int,
  generation_job_id uuid,
  created_at timestamptz not null default now()
);
create index character_references_character_idx on public.character_references(character_id);

alter table public.characters
  add constraint characters_approved_reference_fk
  foreign key (approved_reference_id) references public.character_references(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
create type public.book_status as enum (
  'draft',              -- settings chosen
  'story_generating',
  'story_ready',        -- parent can edit text
  'story_approved',
  'illustrating',       -- preview illustrations
  'preview_ready',
  'producing',          -- paid; final assets + PDF
  'completed',
  'failed'
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  theme_id uuid references public.story_themes(id),
  style_id uuid references public.illustration_styles(id),
  product_id uuid references public.book_products(id),
  title text check (char_length(title) <= 120),
  language public.book_language not null default 'en',
  age_range text not null default '3-5' check (age_range in ('0-2', '3-5', '6-8', '9-12')),
  page_count int not null check (page_count in (8, 12, 16)),
  orientation public.book_orientation not null default 'portrait',
  lesson text check (char_length(lesson) <= 200),
  dedication text check (char_length(dedication) <= 300),
  custom_idea text check (char_length(custom_idea) <= 1500),
  status public.book_status not null default 'draft',
  current_version_id uuid,                  -- fk added below
  is_favorite boolean not null default false,
  pdf_path text,
  pdf_generated_at timestamptz,
  completed_at timestamptz,
  text_regenerations_used int not null default 0,
  image_regenerations_used int not null default 0,
  ai_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index books_owner_idx on public.books(owner_id, created_at desc);
create index books_status_idx on public.books(status);
create index books_owner_favorite_idx on public.books(owner_id) where is_favorite;
create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

create table public.book_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  version_number int not null,
  title text not null,
  outline jsonb not null default '[]',
  cover_concept text,
  source text not null check (source in ('ai', 'parent', 'ai_rewrite')),
  created_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (book_id, version_number)
);

alter table public.books
  add constraint books_current_version_fk
  foreign key (current_version_id) references public.book_versions(id) on delete set null;

create table public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  version_id uuid not null references public.book_versions(id) on delete cascade,
  page_number int not null check (page_number >= 1),
  text text not null check (char_length(text) <= 1200),
  scene_description text not null default '',
  illustration_prompt text not null default '',
  illustration_id uuid,                     -- fk added below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, page_number)
);
create index book_pages_book_idx on public.book_pages(book_id);
create trigger book_pages_updated_at before update on public.book_pages
  for each row execute function public.set_updated_at();

create table public.generated_illustrations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  page_number int,                          -- null for covers
  kind text not null check (kind in ('page', 'front_cover', 'back_cover')),
  quality_tier text not null check (quality_tier in ('preview', 'final')),
  storage_path text not null unique,        -- illustrations/{owner_id}/{book_id}/{id}.png
  width int,
  height int,
  model text not null,
  prompt text not null,
  generation_job_id uuid,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create index generated_illustrations_book_idx on public.generated_illustrations(book_id, page_number);
create unique index generated_illustrations_current_idx
  on public.generated_illustrations(book_id, kind, coalesce(page_number, 0), quality_tier) where is_current;

alter table public.book_pages
  add constraint book_pages_illustration_fk
  foreign key (illustration_id) references public.generated_illustrations(id) on delete set null;

create table public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  last_page int not null default 0 check (last_page >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create trigger reading_progress_updated_at before update on public.reading_progress
  for each row execute function public.set_updated_at();

-- Parents may only flip is_favorite directly; everything else goes through
-- validated server actions.
create or replace function public.protect_book_columns()
returns trigger language plpgsql as $$
begin
  if public.is_service_role() then
    return new;
  end if;
  if (to_jsonb(new) - array['is_favorite', 'updated_at'])
     is distinct from (to_jsonb(old) - array['is_favorite', 'updated_at']) then
    raise exception 'only is_favorite may be changed directly' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger books_protect_columns before update on public.books
  for each row execute function public.protect_book_columns();

-- >>> 20261016000300_jobs_ai_commerce_admin.sql
-- Storyling: background jobs, AI accounting, commerce, support and administration

-- ---------------------------------------------------------------------------
-- Durable background jobs (Postgres-backed queue, leased with SKIP LOCKED)
-- ---------------------------------------------------------------------------
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  parent_job_id uuid references public.generation_jobs(id) on delete cascade,
  type text not null check (type in (
    'character_generate', 'scene_test', 'story_generate', 'story_rewrite_page',
    'page_illustration', 'cover_illustration', 'book_production', 'pdf_render',
    'purge_expired_photos', 'send_email'
  )),
  stage text not null default 'queued',
  progress smallint not null default 0 check (progress between 0 and 100),
  status public.job_status not null default 'queued',
  priority smallint not null default 0,
  payload jsonb not null default '{}',
  result jsonb,
  idempotency_key text unique,
  attempts int not null default 0,
  max_attempts int not null default 3 check (max_attempts between 1 and 10),
  run_after timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generation_jobs_claim_idx on public.generation_jobs(priority desc, run_after, created_at)
  where status = 'queued';
create index generation_jobs_lease_idx on public.generation_jobs(locked_until) where status = 'processing';
create index generation_jobs_owner_idx on public.generation_jobs(owner_id, created_at desc);
create index generation_jobs_book_idx on public.generation_jobs(book_id);
create index generation_jobs_character_idx on public.generation_jobs(character_id);
create index generation_jobs_parent_idx on public.generation_jobs(parent_job_id);
create trigger generation_jobs_updated_at before update on public.generation_jobs
  for each row execute function public.set_updated_at();

create table public.generation_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  attempt_number int not null,
  worker_id text,
  status public.job_status not null,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (job_id, attempt_number)
);

-- ---------------------------------------------------------------------------
-- AI configuration & usage accounting
-- ---------------------------------------------------------------------------
create table public.ai_model_settings (
  purpose text primary key check (purpose in ('story', 'story_fast', 'image', 'moderation')),
  model text not null,
  params jsonb not null default '{}',       -- e.g. {"preview_quality":"medium","final_quality":"high"}
  timeout_ms int not null default 120000 check (timeout_ms between 5000 and 600000),
  max_retries int not null default 2 check (max_retries between 0 and 6),
  -- USD price table used for cost estimates; admins keep it current with OpenAI pricing.
  pricing jsonb not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger ai_model_settings_updated_at before update on public.ai_model_settings
  for each row execute function public.set_updated_at();

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  job_id uuid references public.generation_jobs(id) on delete set null,
  purpose text not null,
  operation text not null,                  -- e.g. responses.create, images.edit, moderations.create
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  image_count int not null default 0,
  image_size text,
  image_quality text,
  estimated_cost_usd numeric(12, 6),          -- null when no price is configured for the model
  latency_ms int,
  success boolean not null,
  error_code text,
  request_id text,
  created_at timestamptz not null default now()
);
create index ai_usage_logs_created_idx on public.ai_usage_logs(created_at desc);
create index ai_usage_logs_user_idx on public.ai_usage_logs(user_id, created_at desc);
create index ai_usage_logs_book_idx on public.ai_usage_logs(book_id);

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique check (code ~* '^[A-Z0-9_-]{3,32}$'),
  percent_off smallint check (percent_off between 1 and 100),
  amount_off int check (amount_off > 0),
  currency char(3),
  max_redemptions int check (max_redemptions > 0),
  redeemed_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off is null)),
  check (amount_off is null or currency is not null)
);
create trigger discount_codes_updated_at before update on public.discount_codes
  for each row execute function public.set_updated_at();

create table public.payment_gateway_configs (
  gateway public.payment_gateway primary key,
  is_enabled boolean not null default false,
  is_default boolean not null default false,
  mode text not null default 'sandbox' check (mode in ('sandbox', 'live')),
  supported_currencies text[] not null default '{USD}',
  public_config jsonb not null default '{}', -- never secrets; keys live in env vars
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create unique index payment_gateway_single_default_idx on public.payment_gateway_configs(is_default) where is_default;
create trigger payment_gateway_configs_updated_at before update on public.payment_gateway_configs
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  owner_id uuid references auth.users(id) on delete set null,   -- kept (anonymized) for financial records
  book_id uuid references public.books(id) on delete set null,
  status public.payment_status not null default 'pending',
  currency char(3) not null,
  subtotal_amount int not null check (subtotal_amount >= 0),
  discount_amount int not null default 0 check (discount_amount >= 0),
  total_amount int not null check (total_amount >= 0),
  refunded_amount int not null default 0 check (refunded_amount >= 0),
  discount_code_id uuid references public.discount_codes(id) on delete set null,
  gateway public.payment_gateway,
  gateway_checkout_id text,
  customer_email text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_amount = subtotal_amount - discount_amount),
  check (refunded_amount <= total_amount)
);
create index orders_owner_idx on public.orders(owner_id, created_at desc);
create index orders_book_idx on public.orders(book_id);
create index orders_status_idx on public.orders(status, created_at desc);
create unique index orders_gateway_checkout_idx on public.orders(gateway, gateway_checkout_id) where gateway_checkout_id is not null;
-- At most one open or paid order per book.
create unique index orders_one_live_per_book_idx on public.orders(book_id)
  where status in ('pending', 'processing', 'paid', 'partially_refunded');
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.book_products(id) on delete set null,
  description text not null,
  page_count int not null,
  quantity int not null default 1 check (quantity > 0),
  unit_amount int not null check (unit_amount >= 0),
  currency char(3) not null
);
create index order_items_order_idx on public.order_items(order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  gateway public.payment_gateway not null,
  gateway_payment_id text not null,
  status public.payment_status not null,
  amount int not null check (amount >= 0),
  currency char(3) not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gateway, gateway_payment_id)
);
create index payments_order_idx on public.payments(order_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount int not null check (amount > 0),
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  reason text,
  gateway_refund_id text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index refunds_gateway_idx on public.refunds(gateway_refund_id) where gateway_refund_id is not null;
create index refunds_order_idx on public.refunds(order_id);
create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

-- Webhook de-duplication: every gateway event is recorded once.
create table public.payment_webhook_events (
  gateway public.payment_gateway not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  primary key (gateway, event_id)
);

-- What a parent is entitled to after payment: full read + PDF download.
create table public.book_entitlements (
  book_id uuid primary key references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text
);
create index book_entitlements_user_idx on public.book_entitlements(user_id);

-- Financial records are append-only: block deletes even for the service role.
create or replace function public.prevent_delete()
returns trigger language plpgsql as $$
begin
  raise exception '% rows cannot be deleted', tg_table_name using errcode = '42501';
end $$;
create trigger orders_no_delete before delete on public.orders for each row execute function public.prevent_delete();
create trigger payments_no_delete before delete on public.payments for each row execute function public.prevent_delete();
create trigger refunds_no_delete before delete on public.refunds for each row execute function public.prevent_delete();

-- ---------------------------------------------------------------------------
-- Support
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  owner_id uuid references auth.users(id) on delete set null,
  subject text not null check (char_length(subject) between 3 and 140),
  category text not null default 'general' check (category in ('general', 'order', 'book', 'character', 'account', 'privacy', 'bug')),
  status text not null default 'open' check (status in ('open', 'awaiting_customer', 'awaiting_staff', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_owner_idx on public.support_tickets(owner_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets(status, updated_at desc);
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  is_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages(ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Administration
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,  -- readable by anonymous visitors (e.g. brand name)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

create table public.marketing_content (
  key text not null check (key ~ '^[a-z0-9_.]+$'),
  locale public.book_language not null,
  content jsonb not null,
  is_published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);
create trigger marketing_content_updated_at before update on public.marketing_content
  for each row execute function public.set_updated_at();

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}',
  ip_address inet,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs(target_table, target_id);
create trigger admin_audit_logs_no_delete before delete on public.admin_audit_logs
  for each row execute function public.prevent_delete();
create or replace function public.prevent_update()
returns trigger language plpgsql as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '42501';
end $$;
create trigger admin_audit_logs_no_update before update on public.admin_audit_logs
  for each row execute function public.prevent_update();

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null
);
create unique index account_deletion_one_open_idx on public.account_deletion_requests(user_id)
  where status in ('pending', 'processing');

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  template text not null,
  idempotency_key text unique,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index email_log_user_idx on public.email_log(user_id, created_at desc);

-- >>> 20261016000400_rls_and_storage.sql
-- Storyling: Row Level Security, grants and private storage
--
-- Posture
--   * Every table has RLS enabled; default is deny.
--   * Parents read their own rows. Direct writes are allowed only where no
--     business rule applies (child profiles, reading progress, favorites,
--     support conversations). Everything else is written by server code with
--     the service role after validation (orders, jobs, AI output, payments).
--   * Staff can read operational data, but NEVER child photos or their files.
--   * Catalog tables are publicly readable when active.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_roles', 'illustration_styles', 'story_themes', 'book_products',
    'child_profiles', 'child_photos', 'characters', 'character_references', 'books',
    'book_versions', 'book_pages', 'generated_illustrations', 'reading_progress',
    'generation_jobs', 'generation_attempts', 'ai_model_settings', 'ai_usage_logs',
    'discount_codes', 'payment_gateway_configs', 'orders', 'order_items', 'payments',
    'refunds', 'payment_webhook_events', 'book_entitlements', 'support_tickets',
    'support_messages', 'platform_settings', 'marketing_content', 'admin_audit_logs',
    'account_deletion_requests', 'email_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
grant select, update (display_name, locale, marketing_opt_in, guardian_attested_at) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select on public.user_roles to authenticated;
create policy user_roles_select_own on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- no insert/update/delete policies: roles change only via the service role.

-- ---------------------------------------------------------------------------
-- Catalog: public read of active rows, staff read all
-- ---------------------------------------------------------------------------
grant select on public.illustration_styles, public.story_themes, public.book_products to anon, authenticated;
create policy styles_public_read on public.illustration_styles for select to anon, authenticated
  using (is_active or public.is_staff());
create policy themes_public_read on public.story_themes for select to anon, authenticated
  using (is_active or public.is_staff());
create policy products_public_read on public.book_products for select to anon, authenticated
  using (is_active or public.is_staff());

-- ---------------------------------------------------------------------------
-- Children (parent CRUD on own rows)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.child_profiles to authenticated;
create policy children_select on public.child_profiles for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
create policy children_insert on public.child_profiles for insert to authenticated
  with check (owner_id = auth.uid() and public.is_active_user());
create policy children_update on public.child_profiles for update to authenticated
  using (owner_id = auth.uid() and public.is_active_user()) with check (owner_id = auth.uid());
create policy children_delete on public.child_profiles for delete to authenticated
  using (owner_id = auth.uid());

-- Child photos: owner only. Uploads go through the server (validation + hashing).
-- Staff deliberately have NO access.
grant select, delete on public.child_photos to authenticated;
create policy child_photos_select_own on public.child_photos for select to authenticated
  using (owner_id = auth.uid());
create policy child_photos_delete_own on public.child_photos for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Characters & books: parents read own; staff read for operations
-- ---------------------------------------------------------------------------
grant select on public.characters, public.character_references, public.books,
  public.book_versions, public.book_pages, public.generated_illustrations to authenticated;
grant update (is_favorite) on public.books to authenticated;

create policy characters_select on public.characters for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
create policy character_refs_select on public.character_references for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
create policy books_select on public.books for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
create policy books_update_favorite on public.books for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy book_versions_select on public.book_versions for select to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and (b.owner_id = auth.uid() or public.is_staff())));
create policy book_pages_select on public.book_pages for select to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and (b.owner_id = auth.uid() or public.is_staff())));
create policy illustrations_select on public.generated_illustrations for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());

grant select, insert, update, delete on public.reading_progress to authenticated;
create policy reading_progress_own on public.reading_progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Jobs & AI: parents see their own job progress; staff see all
-- ---------------------------------------------------------------------------
grant select on public.generation_jobs to authenticated;
create policy jobs_select on public.generation_jobs for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
grant select on public.generation_attempts, public.ai_usage_logs to authenticated;
create policy attempts_staff on public.generation_attempts for select to authenticated using (public.is_staff());
create policy ai_usage_staff on public.ai_usage_logs for select to authenticated using (public.is_staff());
grant select on public.ai_model_settings to authenticated;
create policy ai_settings_staff on public.ai_model_settings for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Commerce: parents read own records; all writes via server/webhooks
-- ---------------------------------------------------------------------------
grant select on public.orders, public.order_items, public.payments, public.refunds,
  public.book_entitlements to authenticated;
create policy orders_select on public.orders for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.owner_id = auth.uid() or public.is_staff())));
create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.owner_id = auth.uid() or public.is_staff())));
create policy refunds_select on public.refunds for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.owner_id = auth.uid() or public.is_staff())));
create policy entitlements_select on public.book_entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

grant select on public.discount_codes, public.payment_gateway_configs to authenticated;
create policy discounts_staff on public.discount_codes for select to authenticated using (public.is_staff());
create policy gateways_staff on public.payment_gateway_configs for select to authenticated using (public.is_staff());
grant select on public.payment_webhook_events to authenticated;
create policy webhook_events_admin on public.payment_webhook_events for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Support
-- ---------------------------------------------------------------------------
grant select, insert on public.support_tickets to authenticated;
create policy tickets_select on public.support_tickets for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (owner_id = auth.uid() and status = 'open' and assigned_to is null and priority = 'normal');

grant select, insert on public.support_messages to authenticated;
create policy messages_select on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.owner_id = auth.uid() or public.is_staff())));
create policy messages_insert_parent on public.support_messages for insert to authenticated
  with check (
    author_id = auth.uid() and is_staff = false
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.owner_id = auth.uid() and t.status <> 'closed')
  );

-- ---------------------------------------------------------------------------
-- Admin & content
-- ---------------------------------------------------------------------------
grant select on public.platform_settings to anon, authenticated;
create policy settings_public_read on public.platform_settings for select to anon, authenticated
  using (is_public or public.is_staff());

grant select on public.marketing_content to anon, authenticated;
create policy content_public_read on public.marketing_content for select to anon, authenticated
  using (is_published or public.is_staff());

grant select on public.admin_audit_logs to authenticated;
create policy audit_admin on public.admin_audit_logs for select to authenticated using (public.is_admin());

grant select, insert on public.account_deletion_requests to authenticated;
create policy deletion_select on public.account_deletion_requests for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy deletion_insert on public.account_deletion_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

grant select on public.email_log to authenticated;
create policy email_log_staff on public.email_log for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Storage: private buckets, path convention {owner_id}/...
-- Files are served to the browser only via short-lived signed URLs created
-- server-side after an ownership/entitlement check.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('child-photos',   'child-photos',   false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('character-refs', 'character-refs', false, 20971520, array['image/png', 'image/webp', 'image/jpeg']),
  ('illustrations',  'illustrations',  false, 20971520, array['image/png', 'image/webp', 'image/jpeg']),
  ('book-pdfs',      'book-pdfs',      false, 209715200, array['application/pdf']),
  ('public-assets',  'public-assets',  true,  10485760, array['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml'])
on conflict (id) do nothing;

-- Owners may read their own private objects (used when the client requests a
-- signed URL with the user's session). Writes happen server-side only.
create policy storage_owner_read on storage.objects for select to authenticated
  using (
    bucket_id in ('child-photos', 'character-refs', 'illustrations', 'book-pdfs')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy storage_owner_delete_photos on storage.objects for delete to authenticated
  using (bucket_id = 'child-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_public_assets_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-assets');

-- >>> 20261016000500_transactional_functions.sql
-- Storyling: transactional functions used by server code (service role only)

-- ---------------------------------------------------------------------------
-- Job queue
-- ---------------------------------------------------------------------------

-- Idempotent enqueue: the same idempotency_key always returns the same job.
create or replace function public.enqueue_generation_job(
  p_type text,
  p_owner_id uuid,
  p_payload jsonb default '{}',
  p_book_id uuid default null,
  p_character_id uuid default null,
  p_parent_job_id uuid default null,
  p_idempotency_key text default null,
  p_priority smallint default 0,
  p_max_attempts int default 3,
  p_run_after timestamptz default now()
) returns public.generation_jobs
language plpgsql security definer set search_path = public as $$
declare v_job public.generation_jobs;
begin
  insert into public.generation_jobs (type, owner_id, payload, book_id, character_id, parent_job_id,
                                      idempotency_key, priority, max_attempts, run_after)
  values (p_type, p_owner_id, coalesce(p_payload, '{}'), p_book_id, p_character_id, p_parent_job_id,
          p_idempotency_key, p_priority, p_max_attempts, p_run_after)
  on conflict (idempotency_key) do nothing
  returning * into v_job;

  if v_job.id is null then
    select * into v_job from public.generation_jobs where idempotency_key = p_idempotency_key;
  end if;
  return v_job;
end $$;

-- Lease up to p_limit jobs. Expired leases (crashed workers) are recovered
-- first: re-queued if attempts remain, otherwise failed.
create or replace function public.claim_generation_jobs(
  p_worker text,
  p_limit int default 1,
  p_lease_seconds int default 300,
  p_types text[] default null
) returns setof public.generation_jobs
language plpgsql security definer set search_path = public as $$
begin
  with expired as (
    select id, attempts, max_attempts from public.generation_jobs
    where status = 'processing' and locked_until < now()
    for update skip locked
  ), recovered as (
    update public.generation_jobs j
       set status = case when e.attempts >= e.max_attempts then 'failed'::public.job_status else 'queued'::public.job_status end,
           last_error = coalesce(j.last_error, '') || case when j.last_error is null then '' else E'\n' end || 'lease expired (worker interrupted)',
           locked_by = null, locked_until = null,
           completed_at = case when e.attempts >= e.max_attempts then now() else null end
      from expired e where j.id = e.id
    returning j.id, j.attempts
  )
  update public.generation_attempts a set status = 'failed', error = 'lease expired', finished_at = now()
    from recovered r where a.job_id = r.id and a.attempt_number = r.attempts and a.finished_at is null;

  return query
  with picked as (
    select id from public.generation_jobs
    where status = 'queued' and run_after <= now()
      and (p_types is null or type = any(p_types))
    order by priority desc, run_after, created_at
    for update skip locked
    limit greatest(p_limit, 0)
  ), claimed as (
    update public.generation_jobs j
       set status = 'processing', locked_by = p_worker,
           locked_until = now() + make_interval(secs => p_lease_seconds),
           attempts = j.attempts + 1, started_at = coalesce(j.started_at, now())
      from picked p where j.id = p.id
    returning j.*
  ), logged as (
    insert into public.generation_attempts (job_id, attempt_number, worker_id, status)
    select id, attempts, p_worker, 'processing' from claimed
    on conflict (job_id, attempt_number) do nothing
  )
  select * from claimed;
end $$;

create or replace function public.heartbeat_generation_job(
  p_job_id uuid, p_worker text, p_lease_seconds int default 300,
  p_stage text default null, p_progress smallint default null
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.generation_jobs
     set locked_until = now() + make_interval(secs => p_lease_seconds),
         stage = coalesce(p_stage, stage),
         progress = coalesce(p_progress, progress)
   where id = p_job_id and locked_by = p_worker and status = 'processing';
  return found;
end $$;

create or replace function public.complete_generation_job(p_job_id uuid, p_worker text, p_result jsonb default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_attempts int;
begin
  update public.generation_jobs
     set status = 'completed', result = p_result, progress = 100, stage = 'done',
         completed_at = now(), locked_by = null, locked_until = null, last_error = null
   where id = p_job_id and locked_by = p_worker and status = 'processing'
  returning attempts into v_attempts;
  if not found then return false; end if;
  update public.generation_attempts set status = 'completed', finished_at = now()
   where job_id = p_job_id and attempt_number = v_attempts;
  return true;
end $$;

-- Retryable failures back off exponentially (30s, 60s, 120s ...).
create or replace function public.fail_generation_job(
  p_job_id uuid, p_worker text, p_error text, p_retryable boolean default true
) returns public.job_status
language plpgsql security definer set search_path = public as $$
declare v_job public.generation_jobs; v_next public.job_status;
begin
  select * into v_job from public.generation_jobs
   where id = p_job_id and locked_by = p_worker and status = 'processing' for update;
  if not found then return null; end if;

  v_next := case when p_retryable and v_job.attempts < v_job.max_attempts then 'queued' else 'failed' end;
  update public.generation_jobs
     set status = v_next, last_error = left(p_error, 4000), locked_by = null, locked_until = null,
         run_after = case when v_next = 'queued' then now() + make_interval(secs => 30 * power(2, v_job.attempts - 1)::int) else run_after end,
         completed_at = case when v_next = 'failed' then now() else null end
   where id = p_job_id;
  update public.generation_attempts set status = 'failed', error = left(p_error, 4000), finished_at = now()
   where job_id = p_job_id and attempt_number = v_job.attempts;
  return v_next;
end $$;

-- Manual retry (parent "try again" on one illustration, or staff retry).
create or replace function public.retry_generation_job(p_job_id uuid, p_extra_attempts int default 1)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.generation_jobs
     set status = 'queued', run_after = now(), completed_at = null,
         max_attempts = least(attempts + greatest(p_extra_attempts, 1), 10)
   where id = p_job_id and status in ('failed', 'cancelled');
  return found;
end $$;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

-- Called from verified gateway webhooks / capture confirmations. Safe to call
-- any number of times for the same payment (duplicate webhooks).
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_gateway public.payment_gateway,
  p_gateway_payment_id text,
  p_amount int,
  p_currency text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_job public.generation_jobs;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'P0002';
  end if;

  if p_amount <> v_order.total_amount or upper(p_currency) <> v_order.currency then
    insert into public.payments (order_id, gateway, gateway_payment_id, status, amount, currency, failure_reason)
    values (p_order_id, p_gateway, p_gateway_payment_id, 'failed', p_amount, upper(p_currency), 'amount_or_currency_mismatch')
    on conflict (gateway, gateway_payment_id) do nothing;
    -- Return (not raise) so the failed payment row is kept for investigation.
    return jsonb_build_object('order_id', p_order_id, 'error', 'amount_or_currency_mismatch');
  end if;

  insert into public.payments (order_id, gateway, gateway_payment_id, status, amount, currency)
  values (p_order_id, p_gateway, p_gateway_payment_id, 'paid', p_amount, upper(p_currency))
  on conflict (gateway, gateway_payment_id) do update set status = 'paid', updated_at = now()
    where public.payments.status not in ('refunded', 'partially_refunded');

  if v_order.status in ('paid', 'refunded', 'partially_refunded') then
    return jsonb_build_object('order_id', p_order_id, 'already_paid', true);
  end if;

  update public.orders
     set status = 'paid', paid_at = now(), gateway = p_gateway
   where id = p_order_id;

  if v_order.discount_code_id is not null then
    update public.discount_codes set redeemed_count = redeemed_count + 1 where id = v_order.discount_code_id;
  end if;

  if v_order.book_id is not null and v_order.owner_id is not null then
    insert into public.book_entitlements (book_id, user_id, order_id)
    values (v_order.book_id, v_order.owner_id, p_order_id)
    on conflict (book_id) do update set order_id = excluded.order_id, revoked_at = null, revoked_reason = null, granted_at = now();

    update public.books set status = 'producing' where id = v_order.book_id and status <> 'completed';

    v_job := public.enqueue_generation_job(
      'book_production', v_order.owner_id, jsonb_build_object('order_id', p_order_id),
      v_order.book_id, null, null, 'book_production:' || v_order.book_id::text, 10::smallint, 5
    );
  end if;

  return jsonb_build_object('order_id', p_order_id, 'already_paid', false, 'production_job_id', v_job.id);
end $$;

-- Records a refund state change. Full refunds revoke the book entitlement.
create or replace function public.record_refund(
  p_order_id uuid,
  p_gateway_refund_id text,
  p_amount int,
  p_currency text,
  p_status text,
  p_reason text default null,
  p_requested_by uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_payment public.payments;
  v_refunded int;
  v_new_status public.payment_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order % not found', p_order_id using errcode = 'P0002'; end if;

  select * into v_payment from public.payments
   where order_id = p_order_id and status in ('paid', 'partially_refunded', 'refunded')
   order by created_at desc limit 1;
  if not found then raise exception 'order % has no captured payment', p_order_id using errcode = 'P0002'; end if;

  insert into public.refunds (payment_id, order_id, amount, currency, status, reason, gateway_refund_id, requested_by)
  values (v_payment.id, p_order_id, p_amount, upper(p_currency), p_status, p_reason, p_gateway_refund_id, p_requested_by)
  on conflict (gateway_refund_id) where gateway_refund_id is not null
  do update set status = excluded.status, updated_at = now();

  select coalesce(sum(amount), 0) into v_refunded from public.refunds
   where order_id = p_order_id and status = 'succeeded';
  if v_refunded > v_order.total_amount then
    raise exception 'refunds exceed order total for %', p_order_id using errcode = '22023';
  end if;

  v_new_status := case
    when v_refunded = 0 then 'paid'
    when v_refunded >= v_order.total_amount then 'refunded'
    else 'partially_refunded' end;

  update public.orders set refunded_amount = v_refunded, status = v_new_status where id = p_order_id;
  update public.payments set status = v_new_status where id = v_payment.id;

  if v_new_status = 'refunded' and v_order.book_id is not null then
    update public.book_entitlements set revoked_at = now(), revoked_reason = 'refunded'
     where book_id = v_order.book_id and revoked_at is null;
  end if;

  return jsonb_build_object('order_id', p_order_id, 'refunded_amount', v_refunded, 'status', v_new_status);
end $$;

-- Does the current user (or p_user) hold an active entitlement to the book?
create or replace function public.has_book_entitlement(p_book_id uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.book_entitlements
     where book_id = p_book_id and revoked_at is null
       and user_id = coalesce(case when coalesce(auth.role(), '') = 'service_role' or public.is_staff() then p_user end, auth.uid())
  )
$$;

-- ---------------------------------------------------------------------------
-- Lock down execution: server-only functions are not callable by clients.
-- ---------------------------------------------------------------------------
revoke execute on function public.enqueue_generation_job(text, uuid, jsonb, uuid, uuid, uuid, text, smallint, int, timestamptz) from public, anon, authenticated;
revoke execute on function public.claim_generation_jobs(text, int, int, text[]) from public, anon, authenticated;
revoke execute on function public.heartbeat_generation_job(uuid, text, int, text, smallint) from public, anon, authenticated;
revoke execute on function public.complete_generation_job(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_generation_job(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.retry_generation_job(uuid, int) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, public.payment_gateway, text, int, text) from public, anon, authenticated;
revoke execute on function public.record_refund(uuid, text, int, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.enqueue_generation_job(text, uuid, jsonb, uuid, uuid, uuid, text, smallint, int, timestamptz) to service_role;
grant execute on function public.claim_generation_jobs(text, int, int, text[]) to service_role;
grant execute on function public.heartbeat_generation_job(uuid, text, int, text, smallint) to service_role;
grant execute on function public.complete_generation_job(uuid, text, jsonb) to service_role;
grant execute on function public.fail_generation_job(uuid, text, text, boolean) to service_role;
grant execute on function public.retry_generation_job(uuid, int) to service_role;
grant execute on function public.mark_order_paid(uuid, public.payment_gateway, text, int, text) to service_role;
grant execute on function public.record_refund(uuid, text, int, text, text, text, uuid) to service_role;

grant execute on function public.has_role(public.app_role), public.is_admin(), public.is_staff(),
  public.is_active_user(), public.has_book_entitlement(uuid, uuid) to anon, authenticated, service_role;

-- >>> 20261016000600_reference_data.sql
-- Storyling: initial reference data. Everything here is editable from the
-- Admin Dashboard; nothing below is read from code as a constant.

insert into public.illustration_styles (slug, name_en, name_ar, description_en, description_ar, prompt_template, sort_order) values
  ('3d-cartoon', '3D Cartoon', 'كرتون ثلاثي الأبعاد',
   'Soft, rounded 3D characters with warm studio lighting.',
   'شخصيات ثلاثية الأبعاد ناعمة ومستديرة بإضاءة دافئة.',
   'Rendered as a high-quality 3D animated film character: soft rounded forms, subsurface-scattered skin, gentle warm key light, soft ambient occlusion, clean pastel-friendly palette, expressive but natural eyes.', 1),
  ('watercolor-storybook', 'Watercolor Storybook', 'ألوان مائية',
   'Hand-painted watercolor washes like a classic picture book.',
   'رسومات بالألوان المائية مثل كتب الأطفال الكلاسيكية.',
   'Painted in traditional watercolor picture-book style: translucent layered washes, soft paper texture, delicate ink linework, gentle bleeding edges, warm natural palette.', 2),
  ('2d-cartoon', '2D Cartoon', 'كرتون ثنائي الأبعاد',
   'Bold, clean 2D cartoon with bright flat colors.',
   'رسوم كرتونية ثنائية الأبعاد بألوان زاهية.',
   'Drawn as a clean modern 2D cartoon: confident outlines, flat bright colors with simple cel shading, friendly proportions, crisp shapes.', 3),
  ('magical-fairytale', 'Magical Fairytale', 'حكاية خيالية ساحرة',
   'Dreamy, luminous fairytale painting with sparkles and glow.',
   'لوحة خيالية حالمة مضيئة مع لمعان وبريق.',
   'Painted as a dreamy luminous fairytale illustration: soft glowing light, gentle sparkles, rich jewel tones, painterly textures, enchanting atmosphere.', 4)
on conflict (slug) do nothing;

insert into public.story_themes (slug, name_en, name_ar, prompt_guidance, is_custom, is_featured, sort_order) values
  ('magical-adventure',   'Magical Adventure',   'مغامرة سحرية',     'A journey through a magical land with gentle wonder and a satisfying discovery.', false, true, 1),
  ('space-adventure',     'Space Adventure',     'مغامرة في الفضاء', 'A friendly trip among stars and planets; curiosity and teamwork.', false, true, 2),
  ('underwater-adventure','Underwater Adventure','مغامرة تحت الماء', 'Exploring a colourful ocean with kind sea creatures.', false, true, 3),
  ('dinosaur-world',      'Dinosaur World',      'عالم الديناصورات', 'Meeting friendly dinosaurs; nothing frightening or violent.', false, true, 4),
  ('enchanted-forest',    'Enchanted Forest',    'الغابة المسحورة',  'A gentle forest of talking animals, glowing plants and small mysteries.', false, false, 5),
  ('superhero-adventure', 'Superhero Adventure', 'مغامرة بطل خارق',  'The child discovers a kind superpower and helps others; no violence.', false, true, 6),
  ('animal-friends',      'Animal Friends',      'أصدقاء الحيوانات', 'Friendship and care for animals.', false, false, 7),
  ('bedtime',             'Bedtime',             'قصة قبل النوم',    'Calm, slow, soothing; ends with the child falling peacefully asleep.', false, false, 8),
  ('birthday',            'Birthday',            'عيد الميلاد',      'A celebratory birthday adventure with surprises and friends.', false, false, 9),
  ('friendship',          'Friendship',          'الصداقة',          'Making and keeping friends, sharing and empathy.', false, false, 10),
  ('kindness',            'Kindness',            'اللطف',            'Small acts of kindness make a big difference.', false, false, 11),
  ('courage',             'Courage',             'الشجاعة',          'Facing a gentle, age-appropriate fear and growing braver.', false, false, 12),
  ('learning',            'Learning',            'التعلّم',          'Curiosity and learning something new in a playful way.', false, false, 13),
  ('custom',              'Custom Story',        'قصة مخصّصة',       'Follow the parent''s idea closely while keeping it age-appropriate.', true, false, 14)
on conflict (slug) do nothing;

-- Launch prices confirmed by the owner (USD 19 / 24 / 29). Editable in Admin > Products and Pricing.
insert into public.book_products (sku, name_en, name_ar, page_count, price_amount, currency, free_preview_pages, included_regenerations, sort_order) values
  ('book-8-usd',  '8-page storybook',  'كتاب من 8 صفحات',  8,  1900, 'USD', 2, 8,  1),
  ('book-12-usd', '12-page storybook', 'كتاب من 12 صفحة', 12, 2400, 'USD', 2, 12, 2),
  ('book-16-usd', '16-page storybook', 'كتاب من 16 صفحة', 16, 2900, 'USD', 2, 16, 3)
on conflict (sku) do nothing;

-- Model ids are configurable. pricing is left empty on purpose: admins enter
-- current OpenAI prices; until then cost estimates are recorded as unknown.
insert into public.ai_model_settings (purpose, model, params, timeout_ms, max_retries) values
  ('story',      'gpt-5.5',                '{"reasoning_effort":"medium"}', 180000, 2),
  ('story_fast', 'gpt-5.4-mini',           '{}', 60000, 2),
  ('image',      'gpt-image-2',            '{"preview_quality":"medium","final_quality":"high","output_format":"png"}', 300000, 2),
  ('moderation', 'omni-moderation-latest', '{}', 30000, 2)
on conflict (purpose) do nothing;

insert into public.payment_gateway_configs (gateway, is_enabled, is_default, mode, supported_currencies) values
  ('stripe', false, true,  'sandbox', '{USD}'),
  ('paypal', false, false, 'sandbox', '{USD}')
on conflict (gateway) do nothing;

insert into public.platform_settings (key, value, is_public) values
  ('brand.name',                              '"Storyling"', true),
  ('brand.support_email',                     '"support@example.com"', true),
  ('limits.free_character_attempts',          '3',    false),
  ('limits.free_story_attempts',              '3',    false),
  ('limits.free_illustration_previews',       '2',    false),
  ('limits.daily_image_generations_per_user', '30',   false),
  ('limits.daily_text_generations_per_user',  '40',   false),
  ('limits.max_concurrent_jobs_per_user',     '4',    false),
  ('limits.daily_platform_spend_usd',         '100',  false),
  ('limits.worker_concurrency',               '3',    false),
  ('retention.child_photo_days',              '30',   false),
  ('features.google_auth',                    'false', true),
  ('features.design_system_public',           'false', false)
on conflict (key) do nothing;

-- >>> 20261016000700_rate_limits.sql
-- Storyling: fixed-window rate limiting shared across serverless instances.

create table public.rate_limit_counters (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limit_counters enable row level security;
revoke all on public.rate_limit_counters from anon, authenticated;
grant all on public.rate_limit_counters to service_role;

-- Returns true when the call is allowed (and counts it), false when limited.
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limit_counters (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limit_counters.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end $$;

create or replace function public.prune_rate_limits() returns int
language sql security definer set search_path = public as $$
  with d as (delete from public.rate_limit_counters where window_start < now() - interval '2 days' returning 1)
  select count(*)::int from d
$$;

revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.prune_rate_limits() from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
grant execute on function public.prune_rate_limits() to service_role;

-- >>> 20261016000800_book_page_layout_and_costs.sql
-- Storyling: per-page text placement and atomic cost accounting

alter table public.book_pages
  add column text_position text not null default 'bottom'
  check (text_position in ('top', 'bottom', 'start', 'end'));

create or replace function public.add_book_cost(p_book_id uuid, p_amount numeric)
returns void language sql security definer set search_path = public as $$
  update public.books set ai_cost_usd = ai_cost_usd + coalesce(p_amount, 0) where id = p_book_id
$$;

create or replace function public.increment_book_counter(p_book_id uuid, p_counter text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if p_counter = 'text' then
    update public.books set text_regenerations_used = text_regenerations_used + 1 where id = p_book_id returning text_regenerations_used into v;
  elsif p_counter = 'image' then
    update public.books set image_regenerations_used = image_regenerations_used + 1 where id = p_book_id returning image_regenerations_used into v;
  else
    raise exception 'unknown counter %', p_counter;
  end if;
  return v;
end $$;

revoke execute on function public.add_book_cost(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.increment_book_counter(uuid, text) from public, anon, authenticated;
grant execute on function public.add_book_cost(uuid, numeric) to service_role;
grant execute on function public.increment_book_counter(uuid, text) to service_role;

-- The newest generated reference (shown for review); approved_reference_id is
-- what story illustrations use.
alter table public.characters
  add column latest_reference_id uuid references public.character_references(id) on delete set null;

-- >>> 20261016000900_mark_paid_superseded_checkouts.sql
-- Storyling: mark_order_paid also handles payments for superseded checkouts.
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_gateway public.payment_gateway,
  p_gateway_payment_id text,
  p_amount int,
  p_currency text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_job public.generation_jobs;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'P0002';
  end if;

  if p_amount <> v_order.total_amount or upper(p_currency) <> v_order.currency then
    insert into public.payments (order_id, gateway, gateway_payment_id, status, amount, currency, failure_reason)
    values (p_order_id, p_gateway, p_gateway_payment_id, 'failed', p_amount, upper(p_currency), 'amount_or_currency_mismatch')
    on conflict (gateway, gateway_payment_id) do nothing;
    -- Return (not raise) so the failed payment row is kept for investigation.
    return jsonb_build_object('order_id', p_order_id, 'error', 'amount_or_currency_mismatch');
  end if;

  insert into public.payments (order_id, gateway, gateway_payment_id, status, amount, currency)
  values (p_order_id, p_gateway, p_gateway_payment_id, 'paid', p_amount, upper(p_currency))
  on conflict (gateway, gateway_payment_id) do update set status = 'paid', updated_at = now()
    where public.payments.status not in ('refunded', 'partially_refunded');

  if v_order.status in ('paid', 'refunded', 'partially_refunded') then
    return jsonb_build_object('order_id', p_order_id, 'already_paid', true);
  end if;

  -- Money was captured for a superseded checkout (e.g. an old browser tab).
  -- Honour it: cancel any other unpaid order for the book. If the book was
  -- already paid through another order, keep this payment flagged for refund.
  if v_order.book_id is not null then
    if exists (select 1 from public.orders where book_id = v_order.book_id and id <> p_order_id
               and status in ('paid', 'partially_refunded')) then
      return jsonb_build_object('order_id', p_order_id, 'error', 'duplicate_payment_requires_refund');
    end if;
    update public.orders set status = 'cancelled'
     where book_id = v_order.book_id and id <> p_order_id and status in ('pending', 'processing');
  end if;

  update public.orders
     set status = 'paid', paid_at = now(), gateway = p_gateway
   where id = p_order_id;

  if v_order.discount_code_id is not null then
    update public.discount_codes set redeemed_count = redeemed_count + 1 where id = v_order.discount_code_id;
  end if;

  if v_order.book_id is not null and v_order.owner_id is not null then
    insert into public.book_entitlements (book_id, user_id, order_id)
    values (v_order.book_id, v_order.owner_id, p_order_id)
    on conflict (book_id) do update set order_id = excluded.order_id, revoked_at = null, revoked_reason = null, granted_at = now();

    update public.books set status = 'producing' where id = v_order.book_id and status <> 'completed';

    v_job := public.enqueue_generation_job(
      'book_production', v_order.owner_id, jsonb_build_object('order_id', p_order_id),
      v_order.book_id, null, null, 'book_production:' || v_order.book_id::text, 10::smallint, 5
    );
  end if;

  return jsonb_build_object('order_id', p_order_id, 'already_paid', false, 'production_job_id', v_job.id);
end $$;

-- >>> 20261016001000_account_deletion_grace.sql
-- Storyling: account deletion requests have a grace period during which the
-- parent can cancel. One open request per account.
alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;
alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'processing', 'completed', 'rejected', 'cancelled'));

alter table public.account_deletion_requests
  add column if not exists scheduled_for timestamptz not null default (now() + interval '7 days');

create unique index if not exists account_deletion_one_open_idx
  on public.account_deletion_requests(user_id) where status in ('pending', 'processing');

-- >>> 20261016001100_admin_functions.sql
-- Storyling: read-only aggregate functions for the admin dashboard.
-- Each one checks the caller is staff; they run as definer only so they can
-- read auth.users emails and aggregate across accounts. Nothing here exposes
-- child photos.

-- Deletion requests outlive the account they deleted (as a compliance record).
alter table public.account_deletion_requests drop constraint if exists account_deletion_requests_user_id_fkey;
alter table public.account_deletion_requests alter column user_id drop not null;
alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'parents',         (select count(*) from public.profiles p where not exists (select 1 from public.user_roles r where r.user_id = p.id and r.role in ('staff', 'admin'))),
    'children',        (select count(*) from public.child_profiles),
    'characters',      (select count(*) from public.characters where status <> 'archived'),
    'books',           (select count(*) from public.books),
    'paid_books',      (select count(*) from public.book_entitlements where revoked_at is null),
    'revenue',         coalesce((select jsonb_object_agg(currency, amount) from (select currency, sum(total_amount) as amount from public.orders where paid_at is not null group by currency) x), '{}'::jsonb),
    'refunds',         coalesce((select jsonb_object_agg(currency, amount) from (select currency, sum(refunded_amount) as amount from public.orders where refunded_amount > 0 group by currency) x), '{}'::jsonb),
    'ai_cost_usd',     coalesce((select sum(estimated_cost_usd) from public.ai_usage_logs), 0),
    'ai_unpriced_calls', (select count(*) from public.ai_usage_logs where estimated_cost_usd is null),
    'ai_cost_24h_usd', coalesce((select sum(estimated_cost_usd) from public.ai_usage_logs where created_at > now() - interval '24 hours'), 0),
    'pending_jobs',    (select count(*) from public.generation_jobs where status in ('queued', 'processing')),
    'failed_jobs',     (select count(*) from public.generation_jobs where status = 'failed'),
    'failed_jobs_24h', (select count(*) from public.generation_jobs where status = 'failed' and updated_at > now() - interval '24 hours'),
    'open_tickets',    (select count(*) from public.support_tickets where status in ('open', 'awaiting_staff')),
    'pending_deletions', (select count(*) from public.account_deletion_requests where status in ('pending', 'processing'))
  ) into v;
  return v;
end $$;

-- Time-series and breakdowns for Reports. p_days is clamped to 1..366.
create or replace function public.admin_report(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := date_trunc('day', now()) - make_interval(days => greatest(1, least(coalesce(p_days, 30), 366)) - 1);
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'from', v_from,
    'days', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb) from (
        select g.day::date as day,
          (select count(*) from public.orders o where o.paid_at >= g.day and o.paid_at < g.day + interval '1 day') as sales,
          (select coalesce(sum(o.total_amount), 0) from public.orders o where o.paid_at >= g.day and o.paid_at < g.day + interval '1 day' and o.currency = 'USD') as revenue_usd,
          (select coalesce(sum(r.amount), 0) from public.refunds r where r.status = 'succeeded' and r.currency = 'USD' and r.updated_at >= g.day and r.updated_at < g.day + interval '1 day') as refunds_usd,
          (select coalesce(sum(a.estimated_cost_usd), 0) from public.ai_usage_logs a where a.created_at >= g.day and a.created_at < g.day + interval '1 day') as ai_cost_usd,
          (select count(*) from public.profiles p where p.created_at >= g.day and p.created_at < g.day + interval '1 day') as new_customers
        from generate_series(v_from, date_trunc('day', now()), interval '1 day') as g(day)
      ) d
    ),
    'themes', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.books desc), '[]'::jsonb) from (
        select th.slug, th.name_en, th.name_ar, count(b.id) as books, count(e.book_id) as paid
        from public.story_themes th
        left join public.books b on b.theme_id = th.id and b.created_at >= v_from
        left join public.book_entitlements e on e.book_id = b.id and e.revoked_at is null
        group by th.id having count(b.id) > 0
      ) t
    ),
    'payments', (
      select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) from (
        select gateway, status, count(*) as count, coalesce(sum(amount), 0) as amount, currency
        from public.payments where created_at >= v_from group by gateway, status, currency
      ) p
    ),
    'checkouts', (
      select jsonb_build_object(
        'started', count(*) filter (where gateway is not null),
        'paid', count(*) filter (where paid_at is not null),
        'failed', count(*) filter (where status = 'failed')
      ) from public.orders where created_at >= v_from
    )
  );
end $$;

-- Customer search by email or name. Returns no child data beyond counts.
create or replace function public.admin_customers(p_query text default null, p_status text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, email text, display_name text, status public.account_status, locale public.book_language, created_at timestamptz,
               roles text[], children bigint, books bigint, paid_orders bigint, deletion_status text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  return query
  with base as (
    select p.id, u.email::text as email, p.display_name, p.status, p.locale, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where (p_query is null or p_query = '' or u.email ilike '%' || p_query || '%' or p.display_name ilike '%' || p_query || '%' or p.id::text = p_query)
      and (p_status is null or p_status = '' or p.status::text = p_status
           or (p_status = 'deletion_pending' and exists (select 1 from public.account_deletion_requests d where d.user_id = p.id and d.status in ('pending', 'processing'))))
  )
  select b.id, b.email, b.display_name, b.status, b.locale, b.created_at,
    coalesce((select array_agg(r.role::text order by r.role) from public.user_roles r where r.user_id = b.id), '{}'),
    (select count(*) from public.child_profiles c where c.owner_id = b.id),
    (select count(*) from public.books k where k.owner_id = b.id),
    (select count(*) from public.orders o where o.owner_id = b.id and o.paid_at is not null),
    (select d.status from public.account_deletion_requests d where d.user_id = b.id order by d.requested_at desc limit 1),
    count(*) over ()
  from base b
  order by b.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;

-- Emails for a page of user ids (tables show who owns what).
create or replace function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  return query select u.id, u.email::text from auth.users u where u.id = any(p_ids[1:200]);
end $$;

revoke execute on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_report(int) from public, anon;
revoke execute on function public.admin_customers(text, text, int, int) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_report(int) to authenticated;
grant execute on function public.admin_customers(text, text, int, int) to authenticated;
