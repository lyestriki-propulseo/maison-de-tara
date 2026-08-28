-- 0009 — Tunnel de réservation public : guichet unique (RPC) + vitrines de disponibilité (vues)
-- Le site (HTML statique, pas de backend) écrit directement dans Supabase avec la clé anon.
-- On ne laisse JAMAIS anon insérer dans `reservations` par une policy RLS classique (le client
-- pourrait forcer status='confirmed' ou trafiquer le montant de l'acompte). À la place : un
-- guichet unique SECURITY DEFINER qui impose 'pending'/'online' et calcule lui-même le prix.
-- L'anti-surbooking existant (trigger check_reservation_capacity, verrou de ligne sur la
-- ressource qui pré-existe toujours) s'applique tel quel, rien à dupliquer.

create or replace function public.book_reservation(
  p_session_instance_id uuid,
  p_event_id uuid,
  p_party_size integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_deposit_cents integer;
  v_capacity integer;
  v_status public.slot_status;
  v_deposit_enabled boolean;
  v_deposit_amount integer;
begin
  if (p_session_instance_id is not null)::int + (p_event_id is not null)::int <> 1 then
    raise exception 'Cible de réservation invalide' using errcode = 'check_violation';
  end if;

  if p_party_size is null or p_party_size < 1 or p_party_size > 20 then
    raise exception 'Nombre de personnes invalide' using errcode = 'check_violation';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Nom requis' using errcode = 'check_violation';
  end if;

  if p_customer_email is null or p_customer_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;

  if p_session_instance_id is not null then
    select capacity, status into v_capacity, v_status
      from public.session_instances
      where id = p_session_instance_id and session_date >= current_date;

    if not found or v_status <> 'open' then
      raise exception 'Créneau introuvable ou fermé' using errcode = 'check_violation';
    end if;

    v_deposit_cents := 600 * p_party_size; -- 6 €/pers, tarif atelier fixe (décision produit 19/08)

    insert into public.reservations
      (session_instance_id, party_size, customer_name, customer_email, customer_phone,
       status, source, deposit_amount_cents)
    values
      (p_session_instance_id, p_party_size, btrim(p_customer_name), lower(btrim(p_customer_email)),
       nullif(btrim(p_customer_phone), ''), 'pending', 'online', v_deposit_cents)
    returning id into v_id;
  else
    select deposit_enabled, deposit_amount_cents into v_deposit_enabled, v_deposit_amount
      from public.events
      where id = p_event_id and published = true and starts_at >= now();

    if not found then
      raise exception 'Événement introuvable ou non publié' using errcode = 'check_violation';
    end if;

    v_deposit_cents := case
      when v_deposit_enabled and v_deposit_amount is not null then v_deposit_amount * p_party_size
      else 0
    end;

    insert into public.reservations
      (event_id, party_size, customer_name, customer_email, customer_phone,
       status, source, deposit_amount_cents)
    values
      (p_event_id, p_party_size, btrim(p_customer_name), lower(btrim(p_customer_email)),
       nullif(btrim(p_customer_phone), ''), 'pending', 'online', v_deposit_cents)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.book_reservation(uuid, uuid, integer, text, text, text) from public;
grant execute on function public.book_reservation(uuid, uuid, integer, text, text, text) to anon;

-- Vitrines de disponibilité (lecture anon) : jamais de chiffres bruts, jamais les réservations
-- elles-mêmes (noms/emails clients), juste un voyant 3 états — même vocabulaire que la légende de
-- l'agenda admin. "Presque complet" = il reste ≤ 25 % de la capacité (seuil arbitraire, à ajuster ;
-- aucun seuil n'existait déjà côté admin malgré la légende visuelle).
-- SECURITY DEFINER assumé sur les deux vues : c'est le seul moyen d'agréger des réservations
-- qu'anon n'a pas le droit de lire directement (RLS deny-by-default sur `reservations`, voulu).

create view public.public_availability
with (security_barrier = true)
as
select
  si.id,
  si.session_date,
  si.start_time,
  si.duration_minutes,
  case
    when coalesce(r.used, 0) >= si.capacity then 'complet'
    when si.capacity - coalesce(r.used, 0) <= greatest(1, ceil(si.capacity * 0.25)) then 'presque_complet'
    else 'disponible'
  end as availability
from public.session_instances si
left join (
  select session_instance_id, sum(party_size) as used
  from public.reservations
  where status in ('pending', 'confirmed') and session_instance_id is not null
  group by session_instance_id
) r on r.session_instance_id = si.id
where si.status = 'open' and si.session_date >= current_date;

comment on view public.public_availability is
  'Vue publique (anon) des créneaux atelier ouverts et futurs. SECURITY DEFINER volontaire : agrège '
  'des réservations qu''anon ne peut pas lire, mais n''expose que date/heure/durée + un label 3-états.';

grant select on public.public_availability to anon;

create view public.public_availability_events
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
  end as availability
from public.events e
left join (
  select event_id, sum(party_size) as used
  from public.reservations
  where status in ('pending', 'confirmed') and event_id is not null
  group by event_id
) r on r.event_id = e.id
where e.published = true and e.starts_at >= now();

comment on view public.public_availability_events is
  'Vue publique (anon) des événements publiés à venir, même principe que public_availability.';

grant select on public.public_availability_events to anon;
