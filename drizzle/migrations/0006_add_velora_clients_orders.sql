CREATE TABLE public.velora_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.velora_clients TO anon, authenticated;
GRANT ALL ON public.velora_clients TO service_role;
ALTER TABLE public.velora_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.velora_clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER velora_clients_touch_updated_at BEFORE UPDATE ON public.velora_clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.velora_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_id UUID REFERENCES public.velora_clients(id) ON DELETE SET NULL,
  item TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  order_date DATE,
  sold_at DATE,
  sale_price NUMERIC,
  expenses NUMERIC,
  deposit NUMERIC,
  financed_amount NUMERIC,
  monthly_payment NUMERIC,
  term_months INTEGER,
  financing_status TEXT NOT NULL DEFAULT 'None',
  financing_org TEXT,
  currency TEXT NOT NULL DEFAULT 'DZD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.velora_orders TO anon, authenticated;
GRANT ALL ON public.velora_orders TO service_role;
ALTER TABLE public.velora_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.velora_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER velora_orders_touch_updated_at BEFORE UPDATE ON public.velora_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();