-- 0011 — Coordonnées du site (téléphone, adresse, email, Instagram, bandeau
-- d'ouverture) rendues éditables depuis /admin/contenu, page 'global'.
-- Avant cette migration elles étaient codées en dur à 4 endroits différents
-- (header : bandeau + bouton mobile + menu tiroir, footer) — un changement de
-- numéro ou d'adresse demandait un développeur sur les 4 à la fois.
-- Voir js/site-content.js (site) pour la lecture + synchronisation des liens
-- tel:/mailto:/instagram.com, et header.html/footer.html pour le balisage.

insert into public.content_blocks
  (page, section, field_key, field_type, label, text_value, sort_order)
values
  ('global', 'Coordonnées', 'global.contact.telephone', 'text', 'Téléphone', '+33 6 50 53 51 49', 10),
  ('global', 'Coordonnées', 'global.contact.adresse', 'text', 'Adresse', '1 Rue Gabriel Péri, 92250 La Garenne-Colombes', 20),
  ('global', 'Coordonnées', 'global.contact.email', 'text', 'Email', 'contact@maisondetara.com', 30),
  ('global', 'Coordonnées', 'global.contact.instagram', 'text', 'Instagram (identifiant, avec le @)', '@maison_de_tara', 40),
  ('global', 'Bandeau du haut', 'global.topbar.ouverture', 'text', 'Message du bandeau (ex : ouverture, fermeture exceptionnelle)', 'Ouverture · Automne 2026', 10);

-- Nettoyage de 4 lignes orphelines (plus aucun élément HTML ne les affiche) :
-- 2 datent d'un retour du 25/08 sur l'accueil (texte retiré, ligne oubliée en
-- base), 2 viennent du retrait des photos d'ambiance de la galerie boutique
-- le 28/08 (la carte 01 pointe maintenant sur l'ex-photo « interlude »).
delete from public.content_blocks
where (page, field_key) in (
  ('accueil', 'accueil.hero.eyebrow'),
  ('accueil', 'accueil.univers.boutique.points'),
  ('boutique', 'boutique.galerie.interlude.photo'),
  ('boutique', 'boutique.galerie.accent.photo')
);
