DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_websites','saas_projects','tasks','leads','digital_products','customers','sales','resources','properties','property_leads'] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id DROP NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id DROP DEFAULT', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon', t);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('client_websites','saas_projects','tasks','leads','digital_products','customers','sales','resources','properties','property_leads')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_websites','saas_projects','tasks','leads','digital_products','customers','sales','resources','properties','property_leads'] LOOP
    EXECUTE format('CREATE POLICY "open access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;