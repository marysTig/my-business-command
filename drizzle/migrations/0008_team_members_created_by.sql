CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO anon, authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ADD COLUMN created_by text;
ALTER TABLE public.client_websites ADD COLUMN created_by text;
ALTER TABLE public.saas_projects ADD COLUMN created_by text;
ALTER TABLE public.car_buyers ADD COLUMN created_by text;
ALTER TABLE public.digital_products ADD COLUMN created_by text;
ALTER TABLE public.customers ADD COLUMN created_by text;
ALTER TABLE public.sales ADD COLUMN created_by text;
ALTER TABLE public.resources ADD COLUMN created_by text;
ALTER TABLE public.velora_clients ADD COLUMN created_by text;
ALTER TABLE public.velora_orders ADD COLUMN created_by text;
ALTER TABLE public.velora_expenses ADD COLUMN created_by text;