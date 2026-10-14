---
id: US-003
titre: Tara cadre ses photos avec un zoom, dans un aperçu qui a la forme réelle de l'emplacement
statut: brouillon
version: 1
projet: Maison de Tara (site + admin)
---

# US-003 — Tara cadre ses photos avec un zoom, dans un aperçu qui a la forme réelle de l'emplacement

## L'histoire

**En tant que** Tara, connectée à l'admin,
**je veux** zoomer et déplacer une photo dans un aperçu qui a exactement la forme de son emplacement
sur le site,
**afin de** voir avant d'enregistrer ce qui s'affichera vraiment, sans bordure parasite ni partie
importante coupée.

**Exemple concret** : le vendredi 16 octobre, Tara ouvre Contenu › Atelier, photo de l'étape 01
(une arche en hauteur). L'aperçu a la forme de l'arche. Elle pousse le zoom à 130 % pour sortir du
cadre la bordure verte de son illustration de devanture, la fait glisser pour centrer la porte, et
enregistre. Sur la page Atelier, l'arche montre exactement ce cadrage.

## Limites (ce que l'US ne fait PAS)

- Pas de mode « image entière » avec fond autour (choix de Lyes du 14/10 : zoom seul) : le zoom part
  de « la photo remplit le cadre » (100 %) et ne descend pas en dessous. Une image très large dans
  une arche haute reste donc coupée sur les côtés.
- Un seul cadrage par photo : quand l'emplacement change de forme selon la largeur d'écran
  (téléphone), le site garde le même centre et le même zoom, sans garantie au pixel près.
- Pas de retouche (rotation, luminosité, filtres).

## Critères d'acceptation

- **CA-01** — Étant donné une photo dans Contenu, quand Tara ouvre son cadrage, alors l'aperçu a la
  forme (rapport largeur/hauteur) de l'emplacement de cette photo sur le site en version ordinateur
  (ex. arche en hauteur pour les étapes de l'Atelier), et non plus un paysage fixe.
- **CA-02** — Étant donné une photo déjà en ligne, quand Tara ouvre son cadrage, alors elle peut
  zoomer de 100 % à 300 % (curseur + boutons − / +) et faire glisser l'image, sans renvoyer le fichier.
- **CA-03** — Étant donné une nouvelle photo choisie sur son ordinateur, quand Tara la cadre avant
  l'envoi, alors elle dispose du même zoom et du même glisser.
- **CA-04** — Étant donné un cadrage enregistré, quand un visiteur ouvre la page (ordinateur), alors
  la photo apparaît avec le même zoom et le même centre que dans l'aperçu de l'admin.
- **CA-05** — Étant donné n'importe quel zoom et n'importe quel déplacement, quand la photo s'affiche
  (admin ou site), alors elle remplit toujours son cadre : jamais de bande vide.
- **CA-06** — Étant donné les photos déjà en ligne avant la livraison, quand la mise à jour est
  déployée, alors leur affichage sur le site ne change pas (zoom 100 % et cadrage actuel conservés).
- **CA-07** — Étant donné un cadrage enregistré, quand Tara rouvre le cadrage de la même photo, alors
  elle retrouve le zoom et la position enregistrés.

## Faits et hypothèses

- **Fait** (`app/src/components/admin/ContentImageField.tsx:210`) : l'aperçu de cadrage est un cadre
  fixe `aspect-[8/5]` (paysage) pour toutes les photos ; seul le glisser existe (`focus x/y`).
- **Fait** (`supabase/migrations/20260922140000_content_image_focus.sql`) : `content_blocks` stocke
  `image_focus_x` / `image_focus_y` (0-100, défaut 50) ; aucun zoom.
- **Fait** (`wandau-mdt/js/site-content.js:54`) : le site applique le cadrage par `object-position`
  seul ; les photos sont en `object-fit: cover`.
- **Fait** (`wandau-mdt/css/premium-atelier.css:144-145`) : les arches ont un masque
  `.arche__mask{overflow:hidden}` ; les autres emplacements n'ont pas été vérifiés un par un.
- **Fait** (mail de Tara du 10/10 + capture) : « est-ce possible d'ajouter un zoom in/out bouton ?
  Sinon chaque fois j'ajoute une photo impossible de régler correctement. »
- **Décision** (Lyes, 14/10) : zoom seul ; pour toutes les photos de Contenu ; aussi sur les photos
  déjà en ligne ; aperçu au format réel de l'emplacement.
- **Hypothèse** : nouvelle colonne `image_zoom` (défaut 1, contrainte 1-3) et nouvelle colonne
  `image_ratio` (rapport de l'emplacement, ex. `0.75`) remplie par migration pour chaque champ photo,
  mesurée sur le site en version ordinateur (1440 px).
- **Hypothèse** : côté site, le zoom est rendu par `transform: scale()` avec `transform-origin` au
  point de cadrage, sur une image dont le parent coupe le débordement ; chaque emplacement photo doit
  être vérifié (et corrigé si besoin) pour que rien ne déborde.
- **Hypothèse (tests)** : calcul du cadrage (zoom + position → rendu) dans une fonction pure testée ;
  CA-04/05 par test navigateur sur le site local avec Supabase simulé (`pnpm e2e:site`) ; CA-06 par
  comparaison de captures avant / après sur toutes les pages ; CA-01/02/07 par e2e admin en lecture
  seule ou recette à l'écran.

## Questions ouvertes

Aucune.

## Relecture

<!-- rapport du sous-agent relecteur : critère visé · problème · bloquant oui/non · traitement -->

## Recette

| Critère | Preuve (test, capture, requête) | Commit | État |
|---|---|---|---|
| CA-01 | | | non vérifié |
| CA-02 | | | non vérifié |
| CA-03 | | | non vérifié |
| CA-04 | | | non vérifié |
| CA-05 | | | non vérifié |
| CA-06 | | | non vérifié |
| CA-07 | | | non vérifié |

## Historique

- 2026-10-14 — v1 brouillon (mail de Tara du 10/10 ; choix de Lyes du 14/10 : zoom seul, toutes les
  photos, photos déjà en ligne comprises, aperçu au format réel).
