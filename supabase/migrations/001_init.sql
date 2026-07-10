-- ─────────────────────────────────────────────
-- Northstar — initial schema
-- Run in your Supabase SQL editor
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── accounts ──────────────────────────────────
create table public.accounts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  code         text not null,
  name         text not null,
  type         text not null,
  balance      numeric not null default 0,
  created_at   timestamptz default now()
);

alter table public.accounts enable row level security;
create policy "users own accounts" on public.accounts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── holdings ──────────────────────────────────
create table public.holdings (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  ticker         text not null,
  name           text not null,
  shares         numeric not null default 0,
  cost_basis     numeric not null default 0,
  current_value  numeric not null default 0,
  annual_dividends numeric not null default 0,
  yield_on_cost  numeric not null default 0,
  drip           boolean not null default false,
  created_at     timestamptz default now()
);

alter table public.holdings enable row level security;
create policy "users own holdings" on public.holdings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── properties ────────────────────────────────
create table public.properties (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  value           numeric not null default 0,
  mortgage_balance numeric not null default 0,
  monthly_rent    numeric not null default 0,
  monthly_expenses numeric not null default 0,
  monthly_pi      numeric not null default 0,
  cash_invested   numeric not null default 0,
  created_at      timestamptz default now()
);

alter table public.properties enable row level security;
create policy "users own properties" on public.properties
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── debts ─────────────────────────────────────
create table public.debts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  type          text not null,
  balance       numeric not null default 0,
  interest_rate numeric not null default 0,
  created_at    timestamptz default now()
);

alter table public.debts enable row level security;
create policy "users own debts" on public.debts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── goals ─────────────────────────────────────
create table public.goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  target      numeric not null default 0,
  current     numeric not null default 0,
  is_complete boolean not null default false,
  created_at  timestamptz default now()
);

alter table public.goals enable row level security;
create policy "users own goals" on public.goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── fire_settings ─────────────────────────────
create table public.fire_settings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade not null unique,
  invested            numeric not null default 0,
  annual_contribution numeric not null default 0,
  expected_return     numeric not null default 0.07,
  annual_spending     numeric not null default 60000,
  current_age         integer not null default 30,
  updated_at          timestamptz default now()
);

alter table public.fire_settings enable row level security;
create policy "users own fire_settings" on public.fire_settings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
