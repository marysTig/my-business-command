-- Leads — service visé par la prospection (Site web, SEO, Publicité, …).
-- À exécuter une fois dans l'éditeur SQL de Supabase : le CLI ne peut pas faire
-- de DDL sur ce projet.
--
-- Tant que ce script n'a pas tourné, le dashboard fonctionne normalement mais le
-- champ « Service » reste vide (l'application ne l'envoie pas s'il est vide).

alter table public.leads add column if not exists service text;

-- Les leads déjà en base sont tous des prospects de création de site.
update public.leads
set service = 'Site web'
where service is null
  and (
    coalesce(desired_property_type, '') ilike '%site%'
    or coalesce(notes, '') ilike '%site%'
  );

create index if not exists leads_service_idx on public.leads (service);
