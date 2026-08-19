-- 0011 — Notifications Brevo : webhook générique (pg_net) + guichets publics newsletter/contact
-- Le trigger ne POSTe jamais le contenu métier, seulement {type, id} — l'app relit la ligne
-- fraîche en service_role avant de composer l'email (cf. spec
-- docs/superpowers/specs/2026-08-19-brevo-integration-design.md). On ne parle jamais à Brevo
-- directement depuis Postgres : uniquement à notre propre app, qui elle-même appelle Brevo.

create extension if not exists pg_net;

-- Secret partagé Postgres → app, jamais en clair ici. Valeur réelle écrasée à l'implémentation
-- (Task 9) via : select vault.update_secret(
--   (select id from vault.secrets where name = 'brevo_webhook_secret'), '<vraie valeur>');
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'brevo_webhook_secret') then
    perform vault.create_secret('CHANGE_ME_AT_DEPLOY', 'brevo_webhook_secret');
  end if;
end $$;

alter table public.reservations add column if not exists notified_at timestamptz;
alter table public.newsletter_subscribers add column if not exists notified_at timestamptz;
alter table public.requests add column if not exists notified_at timestamptz;

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
end;
$$;

create trigger trg_reservations_notify
  after insert on public.reservations
  for each row when (new.source = 'online')
  execute function public.notify_webhook('reservation');

create trigger trg_newsletter_notify_insert
  after insert on public.newsletter_subscribers
  for each row when (new.status = 'pending')
  execute function public.notify_webhook('newsletter');

-- Un ex-désabonné qui se réinscrit redéclenche l'email de confirmation (cf. subscribe_newsletter).
create trigger trg_newsletter_notify_resubscribe
  after update on public.newsletter_subscribers
  for each row when (old.status = 'unsubscribed' and new.status = 'pending')
  execute function public.notify_webhook('newsletter');

create trigger trg_requests_notify
  after insert on public.requests
  for each row
  execute function public.notify_webhook('request');

-- Guichet public newsletter (anon). Upsert sur email : nouvelle ligne → pending (déclenche
-- l'email) ; ex-unsubscribed → repasse pending + nouveau token + notified_at remis à null
-- (sinon la garde d'idempotence du webhook bloquerait le renvoi) ; déjà pending/confirmed →
-- aucune modification, aucun nouvel email.
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
begin
  if v_email = '' or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;

  select id, status into v_id, v_status from public.newsletter_subscribers where email = v_email;

  if v_id is null then
    insert into public.newsletter_subscribers (email, status)
    values (v_email, 'pending')
    returning id into v_id;
  elsif v_status = 'unsubscribed' then
    update public.newsletter_subscribers
      set status = 'pending', confirm_token = gen_random_uuid(), confirmed_at = null, notified_at = null
      where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon;

-- Guichet public contact/privatisation (anon). p_phone/p_party_size/p_desired_date/p_event_type
-- sont optionnels (null pour un simple message, remplis pour une privatisation).
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

  insert into public.requests
    (request_type, name, email, phone, message, party_size, desired_date, event_type)
  values
    (p_request_type, btrim(p_name), lower(btrim(p_email)), nullif(btrim(p_phone), ''),
     btrim(p_message), p_party_size, p_desired_date, p_event_type)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_request(
  public.request_type, text, text, text, text, integer, date, public.event_type
) from public;
grant execute on function public.submit_request(
  public.request_type, text, text, text, text, integer, date, public.event_type
) to anon;
