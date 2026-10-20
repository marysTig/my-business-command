CREATE TABLE public.velora_expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid,
 label text NOT NULL,
 amount numeric,
 currency text NOT NULL DEFAULT 'DZD',
 expense_date date,
 category text,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.velora_expenses TO anon, authenticated;
GRANT ALL ON public.velora_expenses TO service_role;
ALTER TABLE public.velora_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.velora_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER touch_velora_expenses BEFORE UPDATE ON public.velora_expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();