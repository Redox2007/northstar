-- Link holdings to an account so the account balance isn't double-counted
alter table public.holdings
  add column if not exists account_id uuid references public.accounts(id) on delete set null;
