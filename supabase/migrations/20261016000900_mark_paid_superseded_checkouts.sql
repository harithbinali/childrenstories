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

