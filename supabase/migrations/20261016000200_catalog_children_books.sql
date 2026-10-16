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
