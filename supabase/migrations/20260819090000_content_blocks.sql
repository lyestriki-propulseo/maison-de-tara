-- 0010 — Contenu éditable du site (photos + textes de contenu, page par page)
-- Chaque ligne = un emplacement précis sur une page publique (ex: le titre du hero de l'accueil).
-- Tant que rien n'est édité, le HTML statique du site garde sa valeur d'origine (repli, voir
-- js/site-content.js) ; dès qu'une ligne porte une valeur ici, le site l'affiche à la place.
-- Édité par Tara depuis /admin/contenu. Ne couvre PAS : le menu/les boutons (mécanique d'interface),
-- les événements (table events, /admin/programme), les horaires (site_settings, /admin/horaires),
-- ni les créneaux d'atelier affichés sur les pages atelier/contact (chantier Phase 3, agenda→site).

create type public.content_field_type as enum ('text', 'image');

create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section text not null,
  field_key text not null,
  field_type public.content_field_type not null,
  label text not null,
  text_value text,
  image_path text,              -- bucket Storage 'medias'
  image_caption text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (page, field_key)
);

create index content_blocks_page_idx on public.content_blocks (page, sort_order);

create trigger trg_content_blocks_updated_at
  before update on public.content_blocks
  for each row execute function public.set_updated_at();

alter table public.content_blocks enable row level security;

-- Rien de sensible ici (uniquement du contenu déjà destiné à être public) : lecture anon large.
create policy "content_blocks: lecture publique"
  on public.content_blocks for select to anon using (true);

create policy "content_blocks: le staff gère tout"
  on public.content_blocks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
