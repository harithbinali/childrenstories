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
