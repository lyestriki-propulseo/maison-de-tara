-- 0009 — Stockage (Supabase Storage)
-- Deux buckets : 'medias' (images publiques : galerie, couvertures journal, visuels événements)
-- et 'documents' (privé : PDF de bons cadeaux, contiennent des codes → jamais public).

insert into storage.buckets (id, name, public)
  values ('medias', 'medias', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

-- storage.objects a déjà la RLS activée par Supabase. On ajoute nos policies.

-- medias : lecture publique, écriture réservée au staff
create policy "medias: lecture publique"
  on storage.objects for select to anon
  using (bucket_id = 'medias');

create policy "medias: le staff gère"
  on storage.objects for all to authenticated
  using (bucket_id = 'medias' and public.is_staff())
  with check (bucket_id = 'medias' and public.is_staff());

-- documents : staff uniquement (aucun accès public)
create policy "documents: staff uniquement"
  on storage.objects for all to authenticated
  using (bucket_id = 'documents' and public.is_staff())
  with check (bucket_id = 'documents' and public.is_staff());
