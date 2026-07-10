-- ─────────────────────────────────────────────
-- Migration 002 — add category + monthly_expenses
-- Run in Supabase SQL editor AFTER 001_init.sql
-- ─────────────────────────────────────────────

-- Add category column to accounts (retirement | taxable | insurance | liquidity)
alter table public.accounts
  add column if not exists category text not null default 'liquidity';

-- Add monthly_expenses to fire_settings
alter table public.fire_settings
  add column if not exists monthly_expenses numeric not null default 5000;
