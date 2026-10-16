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
