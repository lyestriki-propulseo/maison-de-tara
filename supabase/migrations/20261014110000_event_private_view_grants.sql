-- Correctif US-004 (relecture du 14/10) : la vue public_private_events (une seule table, sans
-- jointure) est modifiable automatiquement par Postgres, et Supabase accorde par défaut TOUS les
-- droits à anon/authenticated sur un nouvel objet du schéma public — `revoke ... from public` ne les
-- retire pas. Sans ce correctif, un visiteur muni de la clé du site pourrait modifier ou supprimer
-- les événements privés publiés à travers la vue. On ne laisse que la lecture.
-- (Les vues public_availability et public_availability_events ne sont pas modifiables : jointure.)
revoke all on public.public_private_events from anon, authenticated;
grant select on public.public_private_events to anon, authenticated;
