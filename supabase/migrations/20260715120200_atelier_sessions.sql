-- 0003 — Atelier : grille hebdo (templates) + créneaux concrets (instances)
-- Modèle : Tara définit une grille hebdomadaire type (session_templates). Les créneaux réservables
-- concrets (session_instances) sont générés à partir de la grille (dates réelles), avec possibilité
-- de blocage (jour férié, privatisation) et d'ajustement ponctuel de la capacité.

create type public.slot_status as enum ('open', 'blocked');

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = dimanche ... 6 = samedi
  start_time time not null,
  duration_minutes integer not null default 120 check (duration_minutes > 0),
  capacity integer not null check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_session_templates_updated_at
  before update on public.session_templates
  for each row execute function public.set_updated_at();

create table public.session_instances (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  start_time time not null,
  duration_minutes integer not null default 120 check (duration_minutes > 0),
  capacity integer not null check (capacity >= 0),
  status public.slot_status not null default 'open',
  template_id uuid references public.session_templates (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_date, start_time)
);

create index session_instances_date_idx on public.session_instances (session_date);

create trigger trg_session_instances_updated_at
  before update on public.session_instances
  for each row execute function public.set_updated_at();

alter table public.session_templates enable row level security;
alter table public.session_instances enable row level security;

-- Le public (site) voit les créneaux ouverts à venir, pour réserver
create policy "sessions: anon lit les créneaux ouverts à venir"
  on public.session_instances for select to anon
  using (status = 'open' and session_date >= current_date);

-- Le staff gère tout
create policy "session_templates: le staff gère tout"
  on public.session_templates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "session_instances: le staff gère tout"
  on public.session_instances for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
