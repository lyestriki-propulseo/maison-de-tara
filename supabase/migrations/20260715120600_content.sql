-- 0007 — Contenu éditorial : journal (blog léger), galerie, infos pratiques
-- Édité par Tara (périmètre ciblé). Le public (site) lit le contenu publié.

-- Journal (blog léger)
create table public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  cover_image_path text,               -- bucket Storage 'medias'
  body text,                           -- HTML/markdown riche
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_published_idx on public.journal_posts (published, published_at desc);

create trigger trg_journal_updated_at
  before update on public.journal_posts
  for each row execute function public.set_updated_at();

-- Galerie : la taille/mise en avant est choisie par Tara (rendu réel dans l'admin)
create type public.gallery_size as enum ('grande', 'moyenne', 'petite');

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,            -- bucket Storage 'medias'
  caption text,
  tag text,
  size public.gallery_size not null default 'petite',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_sort_idx on public.gallery_items (sort_order);

create trigger trg_gallery_updated_at
  before update on public.gallery_items
  for each row execute function public.set_updated_at();

-- Infos pratiques : singleton clé→valeur (horaires JSON, adresse, téléphone, réseaux)
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.journal_posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.site_settings enable row level security;

create policy "journal: anon lit les articles publiés"
  on public.journal_posts for select to anon using (published = true);
create policy "journal: le staff gère tout"
  on public.journal_posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "gallery: anon lit les photos publiées"
  on public.gallery_items for select to anon using (published = true);
create policy "gallery: le staff gère tout"
  on public.gallery_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- anon ne lit QU'une liste blanche de clés publiques (jamais une éventuelle clé de config sensible)
create policy "site_settings: anon lit les clés publiques"
  on public.site_settings for select to anon
  using (key in ('hours', 'contact', 'socials'));
create policy "site_settings: le staff écrit"
  on public.site_settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
