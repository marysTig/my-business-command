-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CLIENT WEBSITES
CREATE TABLE public.client_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  project_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Lead',
  progress_percentage int NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  start_date date,
  deadline date,
  website_url text,
  domain text,
  vercel_project text,
  supabase_project text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SAAS PROJECTS
CREATE TABLE public.saas_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Idea',
  progress_percentage int NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  start_date date,
  target_date date,
  repository_url text,
  production_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROPERTY DATASET (shared reference data, read-only for users)
CREATE TABLE public.property_dataset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  city text,
  commune text,
  property_type text NOT NULL DEFAULT 'Apartment',
  price numeric,
  surface numeric,
  bedrooms int,
  bathrooms int,
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_dataset TO authenticated;
GRANT ALL ON public.property_dataset TO service_role;
ALTER TABLE public.property_dataset ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dataset readable" ON public.property_dataset FOR SELECT TO authenticated USING (true);

-- PROPERTIES
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  city text,
  commune text,
  property_type text NOT NULL DEFAULT 'Apartment',
  price numeric,
  surface numeric,
  bedrooms int,
  bathrooms int,
  images text[] NOT NULL DEFAULT '{}',
  dataset_id uuid REFERENCES public.property_dataset(id) ON DELETE SET NULL,
  marketplace_url text,
  status text NOT NULL DEFAULT 'Draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT properties_unique_dataset UNIQUE (user_id, dataset_id)
);

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  phone text,
  email text,
  source text,
  budget numeric,
  desired_city text,
  desired_property_type text,
  notes text,
  status text NOT NULL DEFAULT 'New',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.property_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, lead_id)
);

-- DIGITAL PRODUCTS
CREATE TABLE public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  product_name text NOT NULL,
  description text,
  product_type text NOT NULL DEFAULT 'File',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  google_drive_url text,
  landing_page_url text,
  status text NOT NULL DEFAULT 'Draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  email text,
  phone text,
  product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL,
  purchase_date date,
  amount numeric,
  payment_status text NOT NULL DEFAULT 'Pending',
  product_type text,
  access_status text NOT NULL DEFAULT 'Active',
  expiration_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_status text NOT NULL DEFAULT 'Pending',
  purchase_date date NOT NULL DEFAULT current_date,
  provider text,
  provider_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'To Do',
  priority text NOT NULL DEFAULT 'Medium',
  due_date date,
  category text,
  notes text,
  client_website_id uuid REFERENCES public.client_websites(id) ON DELETE SET NULL,
  saas_project_id uuid REFERENCES public.saas_projects(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RESOURCES
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  url text,
  category text NOT NULL DEFAULT 'Other',
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  client_website_id uuid REFERENCES public.client_websites(id) ON DELETE SET NULL,
  saas_project_id uuid REFERENCES public.saas_projects(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants, RLS and owner policies for all user-owned tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_websites','saas_projects','properties','leads','property_leads','digital_products','customers','sales','tasks','resources']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "owner select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id);', t);
    EXECUTE format('CREATE POLICY "owner insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);', t);
    EXECUTE format('CREATE POLICY "owner update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', t);
    EXECUTE format('CREATE POLICY "owner delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id);', t);
    IF t <> 'property_leads' THEN
      EXECUTE format('CREATE TRIGGER touch_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
    END IF;
  END LOOP;
END $$;

CREATE INDEX ON public.tasks (user_id, status);
CREATE INDEX ON public.properties (user_id, status);
CREATE INDEX ON public.sales (user_id, purchase_date);

-- Seed shared property dataset
INSERT INTO public.property_dataset (title, description, city, commune, property_type, price, surface, bedrooms, bathrooms)
VALUES
 ('Bright 3-room apartment', 'Sunny apartment near the city center with balcony.', 'Alger', 'Hydra', 'Apartment', 24500000, 95, 3, 2),
 ('Modern villa with garden', 'Spacious villa, private garden and garage.', 'Oran', 'Bir El Djir', 'Villa', 78000000, 320, 5, 3),
 ('Family house', 'Two-floor traditional house, quiet street.', 'Constantine', 'El Khroub', 'House', 31000000, 180, 4, 2),
 ('Buildable land plot', 'Flat land with road access and utilities nearby.', 'Blida', 'Boufarik', 'Land', 15000000, 500, NULL, NULL),
 ('Street-level commercial space', 'High foot traffic commercial unit.', 'Alger', 'Bab Ezzouar', 'Commercial', 42000000, 120, NULL, 1),
 ('Studio near university', 'Compact studio, ideal for rental investment.', 'Annaba', 'Centre', 'Apartment', 9800000, 42, 1, 1),
 ('Sea view duplex', 'Duplex apartment with panoramic sea view.', 'Bejaia', 'Ihaddaden', 'Apartment', 36000000, 140, 4, 2),
 ('Renovated townhouse', 'Fully renovated, ready to move in.', 'Tlemcen', 'Mansourah', 'House', 27500000, 160, 3, 2);