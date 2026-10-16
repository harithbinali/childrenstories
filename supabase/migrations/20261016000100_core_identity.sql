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
