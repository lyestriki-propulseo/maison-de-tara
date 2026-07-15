-- 0001 — Extensions, helpers, profils & rôles
-- Base commune : fonctions utilitaires, table profiles liée à auth.users, rôles admin/staff,
-- helpers RLS is_admin()/is_staff(), création auto d'un profil à l'inscription.

create extension if not exists pgcrypto;

-- updated_at auto sur toute table qui branche ce trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Rôles applicatifs (Tara = admin ; employés futurs = staff)
create type public.user_role as enum ('admin', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helpers RLS (SECURITY DEFINER pour lire profiles sans récursion RLS)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'staff')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Création auto d'un profil à l'inscription d'un utilisateur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "profiles: le staff lit tout"
  on public.profiles for select to authenticated
  using (public.is_staff());

create policy "profiles: chacun lit son profil"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles: l'admin gère les rôles"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ⚠️ Après création du compte de Tara : lui passer le rôle admin
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'abidi.tara@gmail.com');
