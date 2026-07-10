-- Add property type column
alter table public.properties
  add column if not exists type text not null default 'rental';
