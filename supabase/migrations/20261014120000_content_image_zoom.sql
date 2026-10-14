-- US-003 : zoom des photos éditables (1 = la photo remplit juste le cadre, 3 = 300 %).
-- S'ajoute au point de focus (image_focus_x / image_focus_y). Défaut 1 : les photos déjà en ligne
-- ne changent pas.

alter table public.content_blocks
  add column image_zoom numeric(4, 2) not null default 1;

alter table public.content_blocks
  add constraint content_blocks_image_zoom_range
    check (image_zoom between 1 and 3);

notify pgrst, 'reload schema';
