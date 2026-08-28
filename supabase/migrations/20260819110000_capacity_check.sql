-- 0010 — Tunnel public : message d'erreur propre + vérif de capacité avant clic
-- Deux retours de terrain sur le tunnel de réservation (19/08) :
-- 1. Le message brut du trigger anti-surbooking ("Capacité dépassée : 5 demandées, 4 restantes")
--    remontait tel quel au client via book_reservation. Il expose un chiffre exact de places
--    restantes — exactement ce que la vue public_availability est censée ne JAMAIS révéler
--    (3 états seulement, décision produit du 19/08). On l'attrape et on le remplace par un
--    message sans chiffre.
-- 2. Le site veut pouvoir griser le bouton "Réserver" AVANT le clic si le nombre de personnes
--    demandé dépasse ce qu'il reste — sans pour autant exposer le chiffre exact au client (le
--    guichet répond juste vrai/faux, jamais la capacité ni le nombre de places restantes).

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

    begin
      insert into public.reservations
        (session_instance_id, party_size, customer_name, customer_email, customer_phone,
         status, source, deposit_amount_cents)
      values
        (p_session_instance_id, p_party_size, btrim(p_customer_name), lower(btrim(p_customer_email)),
         nullif(btrim(p_customer_phone), ''), 'pending', 'online', v_deposit_cents)
      returning id into v_id;
    exception
      when check_violation then
        raise exception 'Il ne reste plus assez de places sur ce créneau pour % personnes. Merci de choisir un autre créneau ou de réduire le nombre de participants.', p_party_size
          using errcode = 'check_violation';
    end;
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

    begin
      insert into public.reservations
        (event_id, party_size, customer_name, customer_email, customer_phone,
         status, source, deposit_amount_cents)
      values
        (p_event_id, p_party_size, btrim(p_customer_name), lower(btrim(p_customer_email)),
         nullif(btrim(p_customer_phone), ''), 'pending', 'online', v_deposit_cents)
      returning id into v_id;
    exception
      when check_violation then
        raise exception 'Il ne reste plus assez de places pour cet événement pour % personnes. Merci de réduire le nombre de participants ou de nous contacter.', p_party_size
          using errcode = 'check_violation';
    end;
  end if;

  return v_id;
end;
$$;

-- Vérif de capacité avant clic : vrai/faux seulement, jamais le nombre de places restantes.
-- Même calcul que le trigger check_reservation_capacity (à garder synchronisé si celui-ci change).
create or replace function public.check_availability(
  p_session_instance_id uuid,
  p_event_id uuid,
  p_party_size integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_used integer;
begin
  if p_party_size is null or p_party_size < 1 then
    return false;
  end if;

  if p_session_instance_id is not null then
    select capacity into v_capacity
      from public.session_instances
      where id = p_session_instance_id and status = 'open' and session_date >= current_date;
    if not found then return false; end if;

    select coalesce(sum(party_size), 0) into v_used
      from public.reservations
      where session_instance_id = p_session_instance_id and status in ('pending', 'confirmed');
  elsif p_event_id is not null then
    select capacity into v_capacity
      from public.events
      where id = p_event_id and published = true and starts_at >= now();
    if not found then return false; end if;

    select coalesce(sum(party_size), 0) into v_used
      from public.reservations
      where event_id = p_event_id and status in ('pending', 'confirmed');
  else
    return false;
  end if;

  return v_used + p_party_size <= v_capacity;
end;
$$;

revoke all on function public.check_availability(uuid, uuid, integer) from public;
grant execute on function public.check_availability(uuid, uuid, integer) to anon;
