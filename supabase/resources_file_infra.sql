-- Resources file infrastructure — one row per resource file attachment.
-- Run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/urkumpgexcdszbdtybmi/sql/new

-- Add file-related columns to the resources table (if they don't already exist):
alter table public.resources add column if not exists file_name text;
alter table public.resources add column if not exists file_type text;  -- e.g. "application/msword", "application/vnd.ms-excel"
alter table public.resources add column if not exists file_size bigint;  -- size in bytes
alter table public.resources add column if not exists storage_path text;  -- R2 key or local path

-- Index for fast lookup by section/file type
create index if not exists resources_file_type_idx
  on public.resources (file_type);
create index if not exists resources_storage_path_idx
  on public.resources (storage_path);

-- Grant permissions for anon/authenticated access (consistent with other tables)
grant select, insert, update, delete on public.resources to anon, authenticated;