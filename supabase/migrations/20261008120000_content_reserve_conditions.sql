-- US-001 (docs/us/US-001-conditions-annulation-editables.md) : conditions d'annulation (une par
-- mode) et mention de paiement des événements rendues éditables dans /admin/contenu, page Atelier,
-- groupe « Réservation » (sort_order après les lignes existantes : l'écran regroupe par section).
-- Côté site : _src/atelier.html (#rf-conditions-*, data-mdt-content) + site-booking.js (toggleMode).
--
-- `on conflict do nothing` : ne réécrit jamais un texte déjà saisi par Tara. Ne PAS ajouter ces
-- clés à app/scripts/seed-content-atelier.mjs (son upsert écraserait ses textes s'il était relancé).
-- Texte de départ de l'atelier = les mots de Tara (mail du 08/10) ; événement vide = rien d'affiché.
insert into public.content_blocks
  (page, section, field_key, field_type, label, text_value, sort_order)
values
  ('atelier', 'Réservation', 'atelier.reserve.conditions', 'text',
   'Conditions d''annulation — atelier libre (laisser vide pour ne rien afficher)',
   'Modification de la date ou de l''horaire possible jusqu''à 48' || chr(160) || 'h avant votre créneau.', 50),
  ('atelier', 'Réservation', 'atelier.reserve.conditions_evenement', 'text',
   'Conditions d''annulation — événement (laisser vide pour ne rien afficher)',
   null, 51),
  ('atelier', 'Réservation', 'atelier.reserve.acompte_evenement', 'text',
   'Paiement — événement',
   'Le prix de l’événement est réglé en totalité en ligne, par carte bancaire.', 52)
on conflict (page, field_key) do nothing;
