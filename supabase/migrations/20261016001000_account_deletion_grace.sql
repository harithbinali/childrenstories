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
