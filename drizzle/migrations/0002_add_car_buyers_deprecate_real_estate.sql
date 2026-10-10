CREATE TABLE public.car_buyers (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid,
  name text not null,
  phone text,
  address text,
  visit_date date,
  car_interest text,
  status text not null default 'New',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_buyers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_buyers TO anon;
GRANT ALL ON public.car_buyers TO service_role;
ALTER TABLE public.car_buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.car_buyers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER touch_car_buyers BEFORE UPDATE ON public.car_buyers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
COMMENT ON TABLE public.properties IS 'DEPRECATED: real estate module replaced by car_buyers';
COMMENT ON TABLE public.leads IS 'DEPRECATED: real estate module replaced by car_buyers';
COMMENT ON TABLE public.property_leads IS 'DEPRECATED: real estate module replaced by car_buyers';
COMMENT ON TABLE public.property_dataset IS 'DEPRECATED: real estate module replaced by car_buyers';