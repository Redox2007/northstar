-- Migration 006 — asset allocation: per-holding asset class + user allocation targets
-- Run in Supabase SQL editor AFTER 005_holdings_prior_close.sql

alter table public.holdings
  add column if not exists asset_class text not null default 'us_stock';

create table if not exists public.allocation_targets (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid references auth.users(id) on delete cascade not null unique,
  us_stock_pct       numeric not null default 60,
  international_pct  numeric not null default 15,
  bond_pct           numeric not null default 10,
  cash_pct           numeric not null default 5,
  real_estate_pct    numeric not null default 5,
  insurance_pct      numeric not null default 5,
  updated_at         timestamptz default now()
);

alter table public.allocation_targets enable row level security;
create policy "users own allocation_targets" on public.allocation_targets
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
