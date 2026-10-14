-- US-004 (docs/us/US-004-evenement-prive.md) : événement privé — sur invitation, sans prix ni
-- réservation en ligne, salle toujours privatisée. Le public n'en voit que la date et les heures.
--
-- 1. Colonne + cohérence : un privé privatise toujours la salle (le blocage des créneaux,
--    sync_event_privatisation, ne regarde que `privatise`).
alter table public.events
  add column is_private boolean not null default false;

alter table public.events
  add constraint events_private_is_privatised check (not is_private or privatise);

comment on column public.events.is_private is
  'Événement privé (US-004) : sans prix ni réservation en ligne ; anon n''en lit jamais le titre ni la description (vue public_private_events).';

-- 2. Lecture anon de la table : plus jamais les privés (titre, description, type restent cachés).
drop policy "events: anon lit les événements publiés" on public.events;
create policy "events: anon lit les événements publiés"
  on public.events for select to anon
  using (published = true and not is_private);

-- 3. Tunnel de réservation : les privés ne sont jamais proposés. Mêmes colonnes, même ordre que
--    20261005110000_event_price_view.sql (create or replace n'autorise aucun changement de colonnes).
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
where e.published = true and not e.is_private and e.starts_at >= now();

-- 4. Calendrier public : les privés publiés, réduits à leurs heures (ni id, ni titre, ni type).
--    Même filtre de dates que le calendrier du site : à partir du début de la journée, heure de Paris.
create view public.public_private_events
with (security_barrier = true)
as
select e.starts_at, e.ends_at
from public.events e
where e.published = true
  and e.is_private = true
  and e.starts_at >= (date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
order by e.starts_at;

comment on view public.public_private_events is
  'Vue publique (anon) des événements privés publiés à venir : seulement leurs heures, pour afficher « Événement privé » au calendrier (US-004).';

revoke all on public.public_private_events from public;
grant select on public.public_private_events to anon, authenticated;
