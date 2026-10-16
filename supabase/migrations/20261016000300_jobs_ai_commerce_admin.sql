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
