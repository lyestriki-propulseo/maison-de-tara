-- 0004 — Événements / workshops (datés, à la fois éditorial et réservable)
-- Les événements sont affichés dans le calendrier public (s'ils sont publiés) et réservables en ligne
-- (avec ou sans acompte). Distincts de l'atelier libre (session_instances).

create type public.event_type as enum ('workshop', 'soiree', 'kids', 'collaboration', 'autre');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  event_type public.event_type not null default 'workshop',
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer not null check (capacity > 0),
  image_path text,                    -- chemin dans le bucket Storage 'medias'
  deposit_enabled boolean not null default true,
  deposit_amount_cents integer check (deposit_amount_cents is null or deposit_amount_cents >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);
create index events_published_idx on public.events (published);

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events: anon lit les événements publiés"
  on public.events for select to anon
  using (published = true);

create policy "events: le staff gère tout"
  on public.events for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
