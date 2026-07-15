-- 0005 — Réservations (atelier OU événement) + garde anti-surbooking
-- Une réservation cible SOIT un créneau d'atelier (session_instance), SOIT un événement.
-- Écrites côté serveur (service_role) : le tunnel public crée une résa 'pending' puis le webhook
-- Monetico la passe 'confirmed'. Un trigger empêche le dépassement de capacité (verrou de ligne).

create type public.reservation_status as enum ('pending', 'confirmed', 'cancelled', 'no_show');
create type public.reservation_source as enum ('online', 'manual');

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  session_instance_id uuid references public.session_instances (id) on delete restrict,
  event_id uuid references public.events (id) on delete restrict,
  party_size integer not null check (party_size > 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status public.reservation_status not null default 'pending',
  source public.reservation_source not null default 'online',
  deposit_amount_cents integer not null default 0 check (deposit_amount_cents >= 0),
  payment_id uuid references public.payments (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_one_target check (
    (session_instance_id is not null)::int + (event_id is not null)::int = 1
  )
);

create index reservations_session_idx on public.reservations (session_instance_id);
create index reservations_event_idx on public.reservations (event_id);
create index reservations_status_idx on public.reservations (status);

create trigger trg_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Garde anti-surbooking : verrouille le créneau/événement cible et somme les résas actives.
create or replace function public.check_reservation_capacity()
returns trigger language plpgsql as $$
declare
  cap integer;
  st public.slot_status;
  used integer;
begin
  -- Les résas annulées / no-show ne consomment pas de capacité
  if new.status in ('cancelled', 'no_show') then
    return new;
  end if;

  if new.session_instance_id is not null then
    select capacity, status into cap, st
      from public.session_instances
      where id = new.session_instance_id
      for update;
    -- On refuse une NOUVELLE résa sur un créneau bloqué, mais on n'empêche pas d'éditer une
    -- résa existante si Tara bloque le créneau après coup (sinon tout UPDATE lèverait l'erreur).
    if st = 'blocked' and tg_op = 'INSERT' then
      raise exception 'Créneau bloqué : nouvelle réservation impossible' using errcode = 'check_violation';
    end if;
    select coalesce(sum(party_size), 0) into used
      from public.reservations
      where session_instance_id = new.session_instance_id
        and status in ('pending', 'confirmed')
        and id <> new.id;
  else
    select capacity into cap
      from public.events
      where id = new.event_id
      for update;
    select coalesce(sum(party_size), 0) into used
      from public.reservations
      where event_id = new.event_id
        and status in ('pending', 'confirmed')
        and id <> new.id;
  end if;

  if used + new.party_size > cap then
    raise exception 'Capacité dépassée : % demandées, % restantes', new.party_size, cap - used
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_reservations_capacity
  before insert or update on public.reservations
  for each row execute function public.check_reservation_capacity();

alter table public.reservations enable row level security;

-- Écriture publique via serveur (service_role). Le staff gère tout depuis l'admin.
create policy "reservations: le staff gère tout"
  on public.reservations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
