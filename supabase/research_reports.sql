-- Research reports ("Recherche") — one row per research run.
-- Run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/urkumpgexcdszbdtybmi/sql/new

create table if not exists public.research_reports (
  actions jsonb default '[]'::jsonb,
  applied_at timestamptz,
  created_at timestamptz default now(),
  created_by text,
  findings text,
  id uuid primary key default gen_random_uuid(),
  question text not null,
  section text not null,
  sources jsonb default '[]'::jsonb,
  summary text,
  updated_at timestamptz default now(),
  user_id uuid
);

create index if not exists research_reports_section_idx
  on public.research_reports (section, created_at desc);

alter table public.research_reports enable row level security;

drop policy if exists "open access" on public.research_reports;
create policy "open access" on public.research_reports for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.research_reports to anon, authenticated;
