-- 0008 — Newsletter (double opt-in / synchro Brevo) & demandes/devis
-- Newsletter : collecte double opt-in, synchro vers Brevo (envoi déclenché depuis l'admin via API Brevo).
-- Demandes : privatisations groupe + contact, atterrissent dans une boîte de l'admin avec statut.
-- Inserts publics via serveur (service_role) ; le staff lit/gère depuis l'admin.

create type public.subscriber_status as enum ('pending', 'confirmed', 'unsubscribed');

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status public.subscriber_status not null default 'pending',
  confirm_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  synced_to_brevo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_newsletter_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

create type public.request_type as enum ('privatisation', 'contact');
create type public.request_status as enum ('nouvelle', 'en_cours', 'traitee', 'devis_envoye');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  request_type public.request_type not null,
  status public.request_status not null default 'nouvelle',
  name text not null,
  email text not null,
  phone text,
  message text,
  party_size integer check (party_size is null or party_size > 0),
  desired_date date,
  event_type public.event_type,        -- réutilise l'enum des événements (workshop/soiree/kids...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_status_idx on public.requests (status);

create trigger trg_requests_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

alter table public.newsletter_subscribers enable row level security;
alter table public.requests enable row level security;

create policy "newsletter: le staff gère tout"
  on public.newsletter_subscribers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "requests: le staff gère tout"
  on public.requests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
