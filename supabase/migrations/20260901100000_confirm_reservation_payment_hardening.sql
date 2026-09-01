-- 0014 — Durcissement de confirm_reservation_payment (revue finale du chantier Stripe)
-- Deux failles trouvées par la revue finale + vérifiées en base (has_function_privilege) :
-- 1) Les grants par défaut de Supabase sur les nouvelles fonctions donnent EXECUTE à anon et
--    authenticated ; le `revoke ... from public` de 0013 ne retire que le rôle PUBLIC générique,
--    pas les rôles nommés. Résultat : n'importe qui pouvait appeler confirm_reservation_payment
--    en direct via PostgREST et créer une réservation confirmée sans payer. On revoke
--    explicitement anon et authenticated (idempotent si déjà absent).
-- 2) Aucun garde-fou anti-abus sur cette RPC (contrairement à book_reservation/submit_request,
--    voir 0012) — exploitable via la branche 0€ de l'endpoint checkout (acompte désactivé sur un
--    événement = écriture publique non authentifiée, non limitée). On porte le même cooldown de
--    5 min par email, à une exception près : exclu pour le même stripe_checkout_session_id, pour
--    ne jamais bloquer une redélivrance webhook légitime du même paiement (l'idempotence sur
--    session_id gère déjà ce cas plus bas dans la fonction).

revoke execute on function public.confirm_reservation_payment(uuid, uuid, integer, text, text, text, text, text, integer) from anon, authenticated;

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

  if exists (
    select 1 from public.reservations
    where customer_email = lower(btrim(p_customer_email))
      and created_at > now() - interval '5 minutes'
      and stripe_checkout_session_id is distinct from p_stripe_checkout_session_id
  ) then
    raise exception 'Une réservation a déjà été enregistrée avec cet email il y a moins de 5 minutes. Merci de patienter avant de réessayer.'
      using errcode = 'check_violation';
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
