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
