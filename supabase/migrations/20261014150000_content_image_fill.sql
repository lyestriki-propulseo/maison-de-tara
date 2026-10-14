-- US-003 v2 : dézoom jusqu'à « Photo entière » et couleur de remplissage de la bande.
-- image_zoom : 0 = mode « Photo entière » (recalculé par le site pour chaque forme de cadre),
-- sinon un zoom de 0 à 3 relatif à « la photo remplit le cadre ». Les lignes existantes (1) ne
-- changent pas.
-- image_fill : couleur #rrggbb calculée par l'admin sur les bords de la photo ; NULL = aucune.

alter table public.content_blocks
  drop constraint content_blocks_image_zoom_range;

alter table public.content_blocks
  add constraint content_blocks_image_zoom_range
    check (image_zoom >= 0 and image_zoom <= 3);

alter table public.content_blocks
  add column image_fill text,
  add constraint content_blocks_image_fill_format
    check (image_fill ~ '^#[0-9a-f]{6}$');

notify pgrst, 'reload schema';
