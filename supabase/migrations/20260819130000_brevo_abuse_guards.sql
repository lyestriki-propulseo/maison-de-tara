-- 0012 — Anti-abus sur les guichets publics Brevo + garde-fou sur notify_webhook()
-- Suite à la revue finale de l'intégration Brevo (docs/superpowers/specs/2026-08-19-brevo-integration-design.md) :
-- 3 RPC anon-exécutables (book_reservation, submit_request, subscribe_newsletter) déclenchent
-- chacune 1-2 emails transactionnels sans aucune limite de fréquence. On ajoute un cooldown de
-- 5 min par email pour les deux guichets qui insèrent une nouvelle ligne à chaque appel
-- (submit_request, book_reservation — la newsletter a déjà sa propre garde via l'upsert existant).
-- On corrige aussi le no-op silencieux de subscribe_newsletter (un abonné dont le PREMIER email de
-- confirmation se perd — filtre spam, etc. — ne pouvait plus jamais en recevoir un second), et on
-- protège notify_webhook() d'une exception qui remonterait jusqu'au INSERT du client (le principe
-- directeur de cette fonctionnalité est qu'un échec de notification ne doit jamais bloquer l'écriture).

-- 1) submit_request : cooldown 5 min par email + troncature défensive des champs texte (jamais de
--    rejet sur la longueur, on tronque simplement — un guichet public ne doit pas planter sur un
--    champ trop long, juste éviter qu'il grossisse indéfiniment la base/les emails).
create or replace function public.submit_request(
  p_request_type public.request_type,
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_party_size integer,
  p_desired_date date,
  p_event_type public.event_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Nom requis' using errcode = 'check_violation';
  end if;
  if p_email is null or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;
  if p_message is null or btrim(p_message) = '' then
    raise exception 'Message requis' using errcode = 'check_violation';
  end if;
  if p_party_size is not null and p_party_size < 1 then
    raise exception 'Nombre de personnes invalide' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.requests
    where email = lower(btrim(p_email))
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Une demande a déjà été envoyée avec cet email il y a moins de 5 minutes. Merci de patienter avant de renvoyer un message.'
      using errcode = 'check_violation';
  end if;

  insert into public.requests
    (request_type, name, email, phone, message, party_size, desired_date, event_type)
  values
    (p_request_type, left(btrim(p_name), 200), lower(btrim(p_email)),
     nullif(left(btrim(p_phone), 30), ''), left(btrim(p_message), 5000),
     p_party_size, p_desired_date, p_event_type)
  returning id into v_id;

  return v_id;
end;
$$;

-- 2) book_reservation : même cooldown 5 min par email client, vérifié avant la logique de cible
--    (créneau vs événement) pour s'appliquer aux deux branches sans dupliquer le check.
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

-- 3) subscribe_newsletter : un abonné 'pending' dont le premier email de confirmation s'est perdu
--    ne devait plus jamais en recevoir — no-op silencieux pour toujours. On rouvre une fenêtre de
--    renvoi : si 'pending' et notified_at null (jamais notifié) ou vieux de plus de 10 min, on
--    remet notified_at à null (le token existant reste valide, pas besoin de le régénérer) pour
--    redéclencher l'email. Si 'pending' et notifié il y a moins de 10 min : no-op — c'est aussi
--    notre garde-fou anti-spam sur la même adresse. 'confirmed' : toujours no-op (déjà fait).
create or replace function public.subscribe_newsletter(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
  v_status public.subscriber_status;
  v_notified_at timestamptz;
begin
  if v_email = '' or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;

  select id, status, notified_at into v_id, v_status, v_notified_at
    from public.newsletter_subscribers where email = v_email;

  if v_id is null then
    insert into public.newsletter_subscribers (email, status)
    values (v_email, 'pending')
    returning id into v_id;
  elsif v_status = 'unsubscribed' then
    update public.newsletter_subscribers
      set status = 'pending', confirm_token = gen_random_uuid(), confirmed_at = null, notified_at = null
      where id = v_id;
  elsif v_status = 'pending' and (v_notified_at is null or v_notified_at < now() - interval '10 minutes') then
    update public.newsletter_subscribers
      set notified_at = null
      where id = v_id;
  end if;
  -- status = 'confirmed', ou 'pending' notifié il y a moins de 10 min : aucune modification.

  return v_id;
end;
$$;

-- Le trigger d'origine ne redéclenchait que sur unsubscribed → pending. Sans l'élargir, le reset
-- de notified_at ci-dessus (branche pending "premier email perdu") resterait inerte : aucun trigger
-- ne surveille cette transition, donc aucun nouveau webhook ne partirait. On élargit la condition à
-- toute UPDATE qui aboutit à status='pending' ET notified_at=null (les deux branches de la fonction
-- ci-dessus, et seulement elles, produisent cet état).
drop trigger if exists trg_newsletter_notify_resubscribe on public.newsletter_subscribers;
create trigger trg_newsletter_notify_resubscribe
  after update on public.newsletter_subscribers
  for each row when (new.status = 'pending' and new.notified_at is null)
  execute function public.notify_webhook('newsletter');

-- 4) notify_webhook() : si net.http_post lève (extension indisponible, etc.), l'exception ne doit
--    jamais remonter jusqu'au trigger AFTER INSERT et faire échouer l'écriture cliente elle-même
--    (réservation/inscription/demande). On log un warning et on laisse la ligne passer.
create or replace function public.notify_webhook()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
  v_url text := 'https://admin.maisondetara.propulseo-site.com/api/webhooks/brevo';
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'brevo_webhook_secret';

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('type', tg_argv[0], 'id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret)
  );
  return new;
exception
  when others then
    raise warning 'notify_webhook a échoué : %', sqlerrm;
    return new;
end;
$$;
