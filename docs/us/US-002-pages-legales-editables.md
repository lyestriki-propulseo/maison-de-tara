---
id: US-002
titre: Tara modifie elle-même les pages Mentions légales et Politique de confidentialité
statut: brouillon
version: 1
projet: Maison de Tara (site + admin)
---

# US-002 — Tara modifie elle-même les pages Mentions légales et Politique de confidentialité

## L'histoire

**En tant que** Tara, gérante de la Maison de Tara, connectée à l'admin,
**je veux** modifier section par section le texte des pages Mentions légales et Politique de
confidentialité,
**afin de** remplacer les « [À COMPLÉTER] » par mes vraies informations (SIRET, hébergeur, durées de
conservation…) et tenir ces pages à jour sans dépendre de Propulseo.

**Exemple concret** : le vendredi 9 octobre, Tara reçoit son extrait Kbis. Elle ouvre l'admin, va dans
Contenu, choisit « Mentions légales », et dans la section « Éditeur du site » remplace
« [À COMPLÉTER : raison sociale] · [forme juridique]… » par « Maison de Tara SAS au capital de
1 000 €, SIRET 123 456 789 00012 », une information par ligne, en terminant par
« Contact : contact@maisondetara.com ». Elle enregistre. Sur le site, la page Mentions légales affiche
ces lignes, et l'adresse email est cliquable.

## Limites (ce que l'US ne fait PAS)

- Sections fixes (choix de Lyes du 08/10 : « une case par section ») : Tara modifie le titre et le texte
  de chaque section existante, et peut masquer une section, mais ne peut pas en ajouter une nouvelle.
- Texte brut : pas de gras ni d'italique. Les gras actuels de la liste « Données collectées » sont perdus
  dès qu'elle est modifiée (même compromis que le reste de l'écran Contenu).
- Le titre de la page (h1), l'amorce « Informations » et la balise `<title>` restent fixes.
- Ne rédige pas le contenu juridique : on reprend le texte actuel, y compris les « [À COMPLÉTER] ».
  Mettre à jour la politique (Stripe, Brevo absents) reste à faire par Tara ou avec elle, hors US.
- Le lien interne « politique de confidentialité » dans la section « Données personnelles » des
  mentions devient du texte simple (les deux pages restent liées depuis le pied de page).

## Critères d'acceptation

- **CA-01** — Étant donné Tara connectée, quand elle ouvre Contenu, alors le filtre de pages propose
  « Mentions légales » et « Politique de confidentialité », et chacune liste ses sections (titre + texte)
  dans l'ordre de la page, préremplies avec le texte actuellement en ligne.
- **CA-02** — Étant donné un titre ou un texte de section modifié et enregistré, quand un visiteur ouvre
  (ou recharge) la page, alors il lit le nouveau contenu à la place de l'ancien.
- **CA-03** — Étant donné un texte de section saisi sur plusieurs lignes, quand il s'affiche, alors un
  retour à la ligne donne une nouvelle ligne et une ligne vide sépare deux paragraphes.
- **CA-04** — Étant donné un texte contenant une adresse email ou une adresse web commençant par
  `https://`, quand il s'affiche, alors elle est cliquable (mailto / lien) ; et du HTML saisi (ex.
  `<b>`, `<script>`) s'affiche tel quel, comme du texte, sans être interprété.
- **CA-05** — Étant donné la section « Données collectées » de la politique, quand Tara modifie sa liste
  (une ligne = un élément), alors la page affiche une liste à puces avec un élément par ligne non vide.
- **CA-06** — Étant donné une section dont Tara vide le titre et enregistre, quand le visiteur ouvre la
  page, alors la section entière (titre et texte) n'apparaît plus.
- **CA-07** — Étant donné Supabase injoignable, quand le visiteur ouvre l'une des deux pages, alors le
  texte statique du HTML s'affiche (repli actuel du site conservé).

## Faits et hypothèses

- **Fait** (`wandau-mdt/_src/mentions-legales.html`) : 6 sections (`<h2>` + `<p>`) : Éditeur,
  Hébergement, Propriété intellectuelle, Données personnelles, Cookies, Responsabilité. La section Éditeur
  utilise des `<br>` et contient le téléphone lié à `global.contact.telephone`.
- **Fait** (`wandau-mdt/_src/politique-de-confidentialite.html`) : 6 sections : Responsable,
  Données collectées (paragraphe + liste `<ul>` à 3 éléments en gras + paragraphe), Finalités, Durée de
  conservation, Destinataires, Vos droits. Liens `mailto:` dans le texte.
- **Fait** : les deux pages chargent déjà `js/site-content.js` (pour les coordonnées du pied de page),
  mais n'ont pas d'attribut `data-mdt-page` sur `<body>`.
- **Fait** (`js/site-content.js`) : modes existants `lines` (coupe sur « , ») et `list` (une ligne = un
  `<li>`/`<p>`), tout en `textContent` (aucune injection HTML possible) ; `data-mdt-hide-if-empty`
  existe pour masquer un bloc.
- **Fait** (`app/src/lib/content.ts:6-14`) : la liste des pages de l'écran Contenu est `CONTENT_PAGES` ;
  un texte fait au plus 4 000 caractères.
- **Hypothèse** : nouvelles pages `mentions-legales` et `confidentialite` dans `content_blocks`, champs
  ajoutés par migration `insert … on conflict do nothing` (aucun écrasement), clés du type
  `mentions-legales.editeur.titre` / `mentions-legales.editeur.texte`.
- **Hypothèse** : nouveau mode d'affichage (ex. `data-mdt-mode="texte"`) dans `site-content.js` :
  ligne vide → nouveau `<p>`, retour à la ligne → `<br>`, emails et `https://…` → liens, construits en
  DOM (jamais `innerHTML`).
- **Hypothèse** : « Données collectées » = 4 champs (titre, introduction, liste, conclusion).

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

- 2026-10-08 — v1 brouillon (demande de Tara par mail du 07/10 ; choix de Lyes : une case par section).
