-- Track previous close price per holding so the UI can show day-over-day % change
alter table public.holdings
  add column if not exists prior_close numeric default 0;
