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
