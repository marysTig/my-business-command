-- Personal daily expenses ("Dépenses") — dashboard section.
-- Run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/urkumpgexcdszbdtybmi/sql/new
--
-- Same conventions as the other tables: text date column (YYYY-MM-DD, matching
-- due_date / visit_date), created_by / created_at / updated_at, and the "open
-- access" policy used across the project.

create table if not exists public.personal_expenses (
  amount numeric not null default 0,
  category text,
  created_at timestamptz default now(),
  created_by text,
  currency text default 'DZD',
  expense_date text not null default to_char(now(), 'YYYY-MM-DD'),
  id uuid primary key default gen_random_uuid(),
  label text not null,
  notes text,
  updated_at timestamptz default now(),
  user_id uuid
);

create index if not exists personal_expenses_expense_date_idx
  on public.personal_expenses (expense_date desc);

alter table public.personal_expenses enable row level security;

drop policy if exists "open access" on public.personal_expenses;
create policy "open access" on public.personal_expenses for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.personal_expenses to anon, authenticated;
