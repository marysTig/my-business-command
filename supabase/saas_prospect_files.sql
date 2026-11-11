-- SaaS "Liste prospection" — Word/Excel files attached to a SaaS project.
-- Run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/urkumpgexcdszbdtybmi/sql/new

create table if not exists public.saas_prospect_files (
  id uuid primary key default gen_random_uuid(),
  saas_project_id uuid not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text not null,
  created_by text,
  created_at timestamptz default now()
);

create index if not exists saas_prospect_files_project_idx
  on public.saas_prospect_files (saas_project_id, created_at desc);

alter table public.saas_prospect_files enable row level security;

drop policy if exists "open access" on public.saas_prospect_files;
create policy "open access" on public.saas_prospect_files
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.saas_prospect_files to anon, authenticated;

-- Storage bucket that holds the actual .doc/.docx/.xls/.xlsx files.
insert into storage.buckets (id, name, public)
values ('prospect-lists', 'prospect-lists', true)
on conflict (id) do update set public = true;

drop policy if exists "prospect lists read" on storage.objects;
create policy "prospect lists read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'prospect-lists');

drop policy if exists "prospect lists insert" on storage.objects;
create policy "prospect lists insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'prospect-lists');

drop policy if exists "prospect lists update" on storage.objects;
create policy "prospect lists update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'prospect-lists');

drop policy if exists "prospect lists delete" on storage.objects;
create policy "prospect lists delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'prospect-lists');
