-- Blackchaine (marque de vêtement) — dashboard section.
-- Run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/urkumpgexcdszbdtybmi/sql/new
--
-- Same conventions as the other tables: text date columns (YYYY-MM-DD), 
-- created_by / created_at / updated_at, and the "open access" policy used
-- across the project.

create table if not exists public.blackchaine_products (
  category text,
  cost numeric default 0,
  created_at timestamptz default now(),
  created_by text,
  currency text default 'DZD',
  id uuid primary key default gen_random_uuid(),
  image_url text,
  name text not null,
  notes text,
  price numeric default 0,
  sizes text,
  status text default 'Active',
  stock integer default 0,
  updated_at timestamptz default now(),
  user_id uuid
);

create table if not exists public.blackchaine_clients (
  address text,
  city text,
  created_at timestamptz default now(),
  created_by text,
  email text,
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  phone text,
  size text,
  updated_at timestamptz default now(),
  user_id uuid
);

create table if not exists public.blackchaine_orders (
  amount_paid numeric default 0,
  channel text,
  client_id uuid references public.blackchaine_clients (id) on delete set null,
  created_at timestamptz default now(),
  created_by text,
  currency text default 'DZD',
  delivery_date text,
  id uuid primary key default gen_random_uuid(),
  item text not null,
  notes text,
  order_date text,
  payment_status text default 'Pending',
  product_id uuid references public.blackchaine_products (id) on delete set null,
  quantity integer default 1,
  size text,
  status text default 'New',
  unit_price numeric default 0,
  updated_at timestamptz default now(),
  user_id uuid
);

create table if not exists public.blackchaine_expenses (
  amount numeric default 0,
  category text,
  created_at timestamptz default now(),
  created_by text,
  currency text default 'DZD',
  expense_date text not null default to_char(now(), 'YYYY-MM-DD'),
  id uuid primary key default gen_random_uuid(),
  label text not null,
  notes text,
  supplier text,
  updated_at timestamptz default now(),
  user_id uuid
);

create index if not exists blackchaine_orders_order_date_idx
  on public.blackchaine_orders (order_date desc);
create index if not exists blackchaine_orders_client_idx
  on public.blackchaine_orders (client_id);
create index if not exists blackchaine_expenses_expense_date_idx
  on public.blackchaine_expenses (expense_date desc);

alter table public.blackchaine_products enable row level security;
alter table public.blackchaine_clients enable row level security;
alter table public.blackchaine_orders enable row level security;
alter table public.blackchaine_expenses enable row level security;

drop policy if exists "open access" on public.blackchaine_products;
create policy "open access" on public.blackchaine_products for all to anon, authenticated using (true) with check (true);

drop policy if exists "open access" on public.blackchaine_clients;
create policy "open access" on public.blackchaine_clients for all to anon, authenticated using (true) with check (true);

drop policy if exists "open access" on public.blackchaine_orders;
create policy "open access" on public.blackchaine_orders for all to anon, authenticated using (true) with check (true);

drop policy if exists "open access" on public.blackchaine_expenses;
create policy "open access" on public.blackchaine_expenses for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.blackchaine_products to anon, authenticated;
grant select, insert, update, delete on public.blackchaine_clients to anon, authenticated;
grant select, insert, update, delete on public.blackchaine_orders to anon, authenticated;
grant select, insert, update, delete on public.blackchaine_expenses to anon, authenticated;
