-- Point de focus des photos éditables.
-- Les valeurs sont des pourcentages CSS object-position : 50 / 50 = centré.

alter table public.content_blocks
  add column image_focus_x numeric(5, 2) not null default 50,
  add column image_focus_y numeric(5, 2) not null default 50;

alter table public.content_blocks
  add constraint content_blocks_image_focus_x_range
    check (image_focus_x between 0 and 100),
  add constraint content_blocks_image_focus_y_range
    check (image_focus_y between 0 and 100);
