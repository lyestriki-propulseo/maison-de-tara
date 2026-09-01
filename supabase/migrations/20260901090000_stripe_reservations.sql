-- 0013 — Paiement Stripe des réservations (remplace Monetico, jamais activé)
-- Voir docs/superpowers/specs/2026-09-01-stripe-reservations-design.md pour le détail des
-- décisions. Résumé : paiement d'abord (Stripe Checkout), réservation créée seulement au
-- webhook confirmé, champs de paiement directement sur `reservations` (pas de table `payments`
-- séparée — aucun autre usage aujourd'hui, `payment_id` n'a jamais été peuplé). book_reservation
-- est retiré du chemin public : remplacé par confirm_reservation_payment, service_role only.

alter table public.reservations drop column payment_id;

alter table public.reservations
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text,
  add column paid_at timestamptz;

comment on column public.reservations.stripe_checkout_session_id is
  'Identifiant de la session Stripe Checkout ayant payé cette réservation. Unique : sert de clé '
  'd''idempotence si Stripe renvoie le même événement webhook plusieurs fois.';

create or replace function public.confirm_reservation_payment(
  p_session_instance_id uuid,
  p_event_id uuid,
  p_party_size integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status public.slot_status;
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

  if p_stripe_checkout_session_id is null or btrim(p_stripe_checkout_session_id) = '' then
    raise exception 'Session Stripe manquante' using errcode = 'check_violation';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'Montant invalide' using errcode = 'check_violation';
  end if;

  if p_session_instance_id is not null then
    select status into v_status
      from public.session_instances
      where id = p_session_instance_id and session_date >= current_date;
    if not found or v_status <> 'open' then
      raise exception 'Créneau introuvable ou fermé' using errcode = 'check_violation';
    end if;
  else
    if not exists (
      select 1 from public.events
      where id = p_event_id and published = true and starts_at >= now()
    ) then
      raise exception 'Événement introuvable ou non publié' using errcode = 'check_violation';
    end if;
  end if;

  begin
    insert into public.reservations
      (session_instance_id, event_id, party_size, customer_name, customer_email, customer_phone,
       status, source, deposit_amount_cents,
       stripe_checkout_session_id, stripe_payment_intent_id, paid_at)
    values
      (p_session_instance_id, p_event_id, p_party_size, btrim(p_customer_name),
       lower(btrim(p_customer_email)), nullif(btrim(p_customer_phone), ''),
       'confirmed', 'online', p_amount_cents,
       p_stripe_checkout_session_id, p_stripe_payment_intent_id, now())
    returning id into v_id;
  exception
    when unique_violation then
      -- Webhook Stripe redélivré (at-least-once) : on renvoie l'id déjà créé, sans dupliquer.
      select id into v_id from public.reservations
        where stripe_checkout_session_id = p_stripe_checkout_session_id;
  end;

  return v_id;
end;
$$;

revoke all on function public.confirm_reservation_payment(uuid, uuid, integer, text, text, text, text, text, integer) from public;
grant execute on function public.confirm_reservation_payment(uuid, uuid, integer, text, text, text, text, text, integer) to service_role;

-- book_reservation : retiré du chemin public. Les réservations en ligne payantes passent
-- maintenant par confirm_reservation_payment (webhook uniquement). La fonction reste en base
-- (inoffensive, plus jamais appelable par anon) : la retirer complètement viendra si on est
-- sûr qu'aucun usage résiduel (résa manuelle sans paiement, etc.) n'en dépendra jamais.
revoke execute on function public.book_reservation(uuid, uuid, integer, text, text, text) from anon;
