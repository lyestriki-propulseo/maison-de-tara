-- Deux correctifs sur les garde-fous anti-abus de 20260819130000_brevo_abuse_guards.sql,
-- relevés par le second regard sur la vague de correction du chantier Brevo.
--
-- 1) book_reservation : le cooldown 5 min par email regardait TOUTES les réservations, y compris
--    celles saisies à la main par Tara (source = 'manual'). Un client qui réserve en ligne juste
--    après que Tara a enregistré une réservation pour lui au comptoir se voyait refuser à tort.
--    Le cooldown ne vise que l'abus du guichet public : on le restreint à source = 'online'.
-- 2) trg_newsletter_notify_resubscribe : la clause WHEN décrivait un ÉTAT (pending + notified_at
--    null) et non une TRANSITION. Aucune UPDATE du dépôt ne l'exploite aujourd'hui, mais toute
--    UPDATE future touchant une autre colonne d'une ligne déjà dans cet état (ex. un job de
--    synchro Brevo) renverrait un email de confirmation en double. On restreint le trigger aux
--    UPDATE qui touchent réellement status ou notified_at.

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

  if exists (
    select 1 from public.reservations
    where customer_email = lower(btrim(p_customer_email))
      and source = 'online'
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Une réservation a déjà été enregistrée avec cet email il y a moins de 5 minutes. Merci de patienter avant de réessayer.'
      using errcode = 'check_violation';
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

drop trigger if exists trg_newsletter_notify_resubscribe on public.newsletter_subscribers;
create trigger trg_newsletter_notify_resubscribe
  after update of status, notified_at on public.newsletter_subscribers
  for each row when (new.status = 'pending' and new.notified_at is null)
  execute function public.notify_webhook('newsletter');
