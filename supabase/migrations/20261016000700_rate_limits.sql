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
