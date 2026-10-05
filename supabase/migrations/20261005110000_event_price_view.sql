-- Expose le prix par personne des événements au tunnel public (site → réservation).
-- Les événements sont payés en totalité en ligne : le prix vit dans `events.deposit_amount_cents`
-- (colonne historique, non renommée), actif quand `deposit_enabled = true`.
--
-- `create or replace view` n'autorise qu'un AJOUT de colonnes en fin de liste : les colonnes
-- existantes sont recopiées à l'identique (même ordre) depuis 20260819100000_public_booking.sql,
-- `price_cents` est ajoutée en dernier. Les droits existants sont conservés ; le grant anon est
-- rejoué par sécurité.

create or replace view public.public_availability_events
with (security_barrier = true)
as
select
  e.id,
  e.slug,
  e.title,
  e.event_type,
  e.description,
  e.starts_at,
  e.ends_at,
  e.image_path,
  case
    when coalesce(r.used, 0) >= e.capacity then 'complet'
    when e.capacity - coalesce(r.used, 0) <= greatest(1, ceil(e.capacity * 0.25)) then 'presque_complet'
    else 'disponible'
  end as availability,
  case when e.deposit_enabled then e.deposit_amount_cents end as price_cents
from public.events e
left join (
  select event_id, sum(party_size) as used
  from public.reservations
  where status in ('pending', 'confirmed') and event_id is not null
  group by event_id
) r on r.event_id = e.id
where e.published = true and e.starts_at >= now();

comment on view public.public_availability_events is
  'Vue publique (anon) des événements publiés à venir, même principe que public_availability. '
  'price_cents = prix par personne payé en totalité en ligne (null si non fixé).';

grant select on public.public_availability_events to anon;
