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
- Texte brut : pas de gras ni d'italique. Comme les champs sont semés avec le texte actuel, le rendu passe
  par le nouveau mode dès la mise en ligne : les gras de la liste « Données collectées » et les encadrés
  pointillés des « [À COMPLÉTER] » (`.todo`) disparaissent ce jour-là, sans action de Tara (le texte
  « [À COMPLÉTER …] » reste lisible).
- La ligne « Contact : email · téléphone » de la section Éditeur reste hors du champ éditable : elle suit
  toujours Contenu › Coordonnées (un seul endroit pour les coordonnées).
- Repli : si Supabase ne répond pas (ou sans JavaScript), le visiteur voit le squelette statique actuel
  (« [À COMPLÉTER] », sections masquées comprises), et ce squelette apparaît un instant au chargement.
  Assumé : même comportement que toutes les autres pages du site.
- Le titre de la page (h1), l'amorce « Informations » et la balise `<title>` restent fixes.
- Ne rédige pas le contenu juridique : on reprend le texte actuel, y compris les « [À COMPLÉTER] ».
  Mettre à jour la politique (Stripe, Brevo absents) reste à faire par Tara ou avec elle, hors US.
- Le lien interne « politique de confidentialité » dans la section « Données personnelles » des
  mentions devient du texte simple (les deux pages restent liées depuis le pied de page).

## Critères d'acceptation

- **CA-01** — Étant donné Tara connectée, quand elle ouvre Contenu, alors le filtre de pages propose
  « Mentions légales » et « Politique de confidentialité », et chacune liste ses sections dans l'ordre de
  la page, préremplies avec le texte statique actuel. Chaque champ a un libellé unique (« Éditeur —
  titre », « Éditeur — texte »…), et le libellé des titres indique que les vider masque la section.
- **CA-02** — Étant donné un titre ou un texte de section modifié et enregistré, quand un visiteur ouvre
  (ou recharge) la page, alors il lit le nouveau contenu à la place de l'ancien.
- **CA-03** — Étant donné un texte de section saisi sur plusieurs lignes, quand il s'affiche, alors un
  retour à la ligne donne une nouvelle ligne et une ligne vide sépare deux paragraphes (une ligne faite
  uniquement d'espaces compte comme vide ; plusieurs lignes vides de suite = un seul saut de paragraphe).
- **CA-04** — Étant donné un texte contenant une adresse email ou une adresse web commençant par
  `http://` ou `https://`, quand il s'affiche, alors elle est cliquable (`mailto:` / lien ouvert dans un
  nouvel onglet, `rel="noopener noreferrer"`). La ponctuation qui suit l'adresse (`. , ; : ! ? ) »`) reste
  hors du lien (« écrivez-nous à contact@maisondetara.com. » → lien `mailto:contact@maisondetara.com`).
  `cnil.fr` ou `www.…` sans `http` restent du texte. Du HTML saisi (ex. `<b>`, `<script>`) s'affiche
  tel quel, comme du texte, sans être interprété.
- **CA-05** — Étant donné la section « Données collectées » de la politique, quand Tara modifie sa liste
  (une ligne = un élément), alors la page affiche une liste à puces avec un élément par ligne non vide.
- **CA-06** — Étant donné une section dont Tara vide le titre et enregistre, quand le visiteur ouvre la
  page, alors la section entière (titre et texte) n'apparaît plus. Étant donné un autre champ vidé (texte
  d'une section, ou introduction / liste / conclusion de « Données collectées »), alors ce bloc seul
  n'apparaît plus — l'ancien texte statique ne revient pas.
- **CA-07** — Étant donné Supabase injoignable, quand le visiteur ouvre l'une des deux pages, alors le
  texte statique du HTML s'affiche (repli actuel du site conservé).

## Faits et hypothèses

- **Fait** (`wandau-mdt/_src/mentions-legales.html`) : 6 sections (`<h2>` + `<p>`) : Éditeur,
  Hébergement, Propriété intellectuelle, Données personnelles, Cookies, Responsabilité. La section Éditeur
  utilise des `<br>` et contient le téléphone lié à `global.contact.telephone` (le HTML statique affiche
  encore l'ancien numéro, la base porte le bon).
- **Fait** (`wandau-mdt/_src/politique-de-confidentialite.html`) : 6 sections : Responsable,
  Données collectées (paragraphe + liste `<ul>` à 3 éléments en gras + paragraphe), Finalités, Durée de
  conservation, Destinataires, Vos droits. Liens `mailto:` dans le texte.
- **Fait** : les deux pages chargent déjà `js/site-content.js` (pour les coordonnées du pied de page),
  mais n'ont pas d'attribut `data-mdt-page` sur `<body>`.
- **Fait** (`js/site-content.js`) : modes existants `lines` (coupe à la première « , ») et `list` (une ligne = un
  `<li>`/`<p>`), tout en `textContent` (aucune injection HTML possible) ; `data-mdt-hide-if-empty`
  existe pour masquer un bloc.
- **Fait** (`app/src/lib/content.ts:6-14`) : la liste des pages de l'écran Contenu est `CONTENT_PAGES` ;
  un texte fait au plus 4 000 caractères.
- **Hypothèse** : nouvelles pages `mentions-legales` et `confidentialite` dans `content_blocks`, champs
  ajoutés par migration `insert … on conflict do nothing` (aucun écrasement), clés du type
  `mentions-legales.editeur.titre` / `mentions-legales.editeur.texte`.
- **Hypothèse** : nouveau mode d'affichage (ex. `data-mdt-mode="texte"`) : ligne vide → nouveau `<p>`,
  retour à la ligne → `<br>`, emails et `http(s)://…` → liens, construits en DOM (jamais `innerHTML`).
  Le découpage texte → blocs/liens est une fonction pure dans un module séparé (ex.
  `js/content-format.js`), pour garder `site-content.js` sous ~200 lignes et tester sans navigateur. Le
  mode vise un conteneur `<div>` (pas un `<p>`, pour éviter des `<p>` imbriqués).
- **Hypothèse** : chaque section est enveloppée dans un bloc `data-mdt-hide-if-empty="<clé du titre>"`,
  et chaque bloc de texte porte `data-mdt-hide-if-empty="<sa propre clé>"` (CA-06). Les règles
  `.mdt-legal h2/p/ul/li` sont descendantes : l'enveloppe ne change pas le rendu.
- **Hypothèse** : les liens créés depuis le texte de Tara sont marqués (ex. `data-mdt-autolink`) et exclus
  de `syncContactHrefs`, qui réécrit aujourd'hui tous les `a[href^="mailto:"]` de la page.
- **Hypothèse** : « Données collectées » = 4 champs (titre, introduction, liste, conclusion) ; la liste
  réutilise le mode `list` existant.
- **Hypothèse (tests)** : CA-03/04/05 = tests unitaires `node:test` de la fonction pure, sur le modèle
  de `tests/umami.test.mjs` (nom de test préfixé par le CA). CA-02/06/07 = test navigateur Playwright sur
  le site servi en local, réponses Supabase simulées (`page.route`) — jamais en modifiant les pages en
  prod. CA-01 = test e2e admin (`app/e2e/contenu.e2e.ts`) ou recette manuelle à l'écran.
- **Hypothèse (mise en ligne)** : trois livrables — migration (base de prod), admin (`feat/socle-v3`,
  redéploiement Coolify manuel), site (`site-deploy`, auto-déployé). Ordre conseillé : migration →
  admin → site ; tout ordre reste sans casse (clé absente = statique, élément absent = rien). En local,
  ouvrir `/wandau-mdt/mentions-legales.html` (les URL sans `.html` ne marchent qu'en prod via nginx).

## Questions ouvertes

Aucune.

## Relecture

- **Général (tests)** · Aucune stratégie de test côté site, alors que la méthode exige un test nommé par
  critère. Il n'existe pas de banc de test DOM pour `wandau-mdt/js` (seul `tests/umami.test.mjs`, node:test
  sans DOM) ; `site-content.js` lance `loadContent()` dès l'import et lit la base de prod
  (`js/supabase-config.js`) ; Playwright (`app/playwright.config.ts`) ne vise que l'admin et tourne contre
  la base de PRODUCTION. À préciser : mise en forme (CA-03/04/05) dans une fonction pure testable hors
  navigateur ; CA-02/06/07 dans un navigateur sur le site statique, avec réponses Supabase simulées
  (`page.route`) plutôt qu'en modifiant les pages légales en prod (CA-06 masquerait une section aux yeux de
  tous) · bloquant : oui
- **Faits / CA-01 (téléphone)** · Le numéro de la section Éditeur est un `<span data-mdt-content="global.contact.telephone">`
  imbriqué dans le `<p>`. Dès que `mentions-legales.editeur.texte` a une valeur, ce `<p>` est remplacé :
  le numéro devient du texte figé, qui ne suit plus Coordonnées (même chose pour l'email). Autre point :
  « le texte actuellement en ligne » ne correspond pas au HTML : le statique affiche `+33 1 80 88 22 35`,
  la base a été semée avec `+33 6 50 53 51 49` (migration 20260828100000). Le pré-remplissage doit donc
  partir de la valeur en base. L'US ne tranche pas entre deux options : numéro saisi et figé par Tara (à
  écrire en Limite), ou ligne de contact laissée hors du champ et toujours synchronisée · bloquant : oui
- **CA-06 (cas manquant)** · Seul le titre vidé est spécifié. Si Tara vide le TEXTE d'une section (ou
  l'intro, la liste ou la conclusion de « Données collectées »), `updateContentText` enregistre `null` et
  `site-content.js` (l. 95) laisse le HTML statique en place : l'ancien texte revient (« [À COMPLÉTER] »,
  liste en gras). C'est le même piège que le CA-04 de l'US-001. Il faut choisir le comportement (texte
  vide = paragraphe retiré ? section masquée ?) et l'écrire en critère · bloquant : oui
- **CA-04 (ponctuation)** · La ponctuation finale n'est pas spécifiée, alors que le texte semé la
  contient dès le premier jour : « écrivez-nous à contact@maisondetara.com. Vous pouvez… » (Vos droits).
  Une détection naïve garde le point (`mailto:contact@maisondetara.com.` est alors cassé), et le CA-04 tel
  qu'écrit passerait quand même. À préciser : `. , ; : ! ? ) »` en fin d'adresse restent hors du lien
  (à prendre comme cas de test). À préciser aussi : `cnil.fr` et `www.…` (sans `https://`) restent du
  texte ; le lien web s'ouvre dans le même onglet ou dans un nouveau (`rel="noopener"`) · bloquant : oui
- **Limites / CA-05 (mise en forme)** · La phrase « Les gras … sont perdus dès qu'elle est modifiée » est
  inexacte. Pour respecter CA-01, la migration sème une valeur non vide (l'admin affiche `textValue ?? ''`),
  et `site-content.js` applique toute valeur non vide. Le gras ET les encadrés pointillés `.todo` des
  « [À COMPLÉTER] » (`mdt-pages.css:16`) disparaissent donc dès la mise en ligne, sans action de Tara.
  Corriger la Limite, ou décider de re-surligner les « [À COMPLÉTER …] » dans le nouveau mode · bloquant : non
- **CA-07 (repli)** · Le repli affiche le squelette HTML. En cas de panne Supabase (ou sans JS), on revoit
  les « [À COMPLÉTER] », l'ancien téléphone et les sections masquées par Tara. C'est correct
  techniquement (`data-mdt-hide-if-empty` ne retire rien si la requête échoue ; clé absente = statique
  conservé, l. 136), mais à assumer explicitement pour des mentions obligatoires. Le même squelette
  s'affiche un instant au chargement, section masquée comprise : tester CA-06 après chargement complet ·
  bloquant : non
- **Faits (site-content.js)** · Le mode `lines` ne coupe qu'à la PREMIÈRE « , » (un seul `<br>`), pas à
  chaque virgule : fait à corriger, sans impact sur l'US. Faits vérifiés exacts : 6 + 6 sections, `<br>` et
  téléphone lié dans Éditeur, 2 liens `mailto:` dans la politique, `js/site-content.js` chargé sans
  `data-mdt-page` (body `class="page-legale"`), `CONTENT_PAGES` en `content.ts:6-14`, limite 4 000 ·
  bloquant : non
- **Faits (4 000 caractères)** · La limite n'existe que dans le schéma zod côté serveur
  (`z.string().trim().max(4000)`) : ni `maxLength` ni compteur sur le textarea, ni contrainte en base.
  Au-delà, Tara reçoit l'erreur technique du validateur. Les sections actuelles font moins de 600
  caractères, donc le risque est faible ; prévoir un message lisible si on en fait un critère. Note :
  `trim()` supprime les lignes vides en début et en fin, ce qui est cohérent avec CA-03 · bloquant : non
- **Hypothèse (mode texte) / construction** · Le mode `texte` produit plusieurs `<p>` : il doit viser un
  conteneur `<div>` (comme le `div.corps` d'`histoire.html`), pas le `<p>` actuel (sinon des `<p>` se
  retrouvent imbriqués). CA-06 suppose d'envelopper chaque `<h2>` + texte dans un bloc
  `data-mdt-hide-if-empty="<clé titre>"` ; les règles `.mdt-legal h2/p/li/ul` étant des sélecteurs
  descendants, l'enveloppe ne casse rien. `site-content.js` fait 146 lignes : le mode ajouté (paragraphes
  + liens) frôlera la limite des ~200 lignes, donc prévoir un module séparé · bloquant : non
- **CA-04 (sécurité)** · `syncContactHrefs('global.contact.email')` réécrit TOUS les `a[href^="mailto:"]`
  de la page. Les lignes `global` passent aujourd'hui avant celles de la page (`results.flat()`), donc les
  liens créés à partir du texte de Tara ne sont pas écrasés. Il faut garder cet ordre (ou exclure ces liens
  de la synchro), sinon une adresse saisie par Tara serait remplacée sans prévenir. Côté XSS,
  `textContent`, construction DOM et liens limités à `mailto:` et `https://` suffisent (`javascript:`
  impossible) · bloquant : non
- **CA-01 (écran Contenu)** · Le titre de bloc de l'admin vient de la colonne `section` (fixe) : si Tara
  renomme une section sur le site, l'admin garde l'ancien nom. Les libellés doivent être uniques
  (« Éditeur — titre », comme dans `seed-content-contact.mjs`), sinon `contenu.e2e.ts`, qui cible un champ
  par son libellé, devient ambigu. « titre + texte » ne s'applique pas à « Données collectées » (4 champs).
  Rien n'indique à Tara que vider le titre masque la section. L'ajout dans `CONTENT_PAGES` demande un
  redéploiement manuel de l'admin · bloquant : non
- **CA-03 (lignes vides)** · « ligne vide » reste à définir : une ligne faite d'espaces compte-t-elle comme
  vide ? Plusieurs lignes vides à la suite donnent-elles un seul saut de paragraphe ? · bloquant : non
- **Général (routage / recette)** · En prod, les URL sont `/mentions-legales` et
  `/politique-de-confidentialite` (nginx `try_files $uri.html`, `.html` → 301). En local
  (`python -m http.server` depuis `C:/mdt-site`), il faut ouvrir `/wandau-mdt/mentions-legales.html`, et
  les liens du pied de page tombent en 404 : à indiquer dans la recette. `noindex` est présent sur les deux
  pages, qui sont absentes du sitemap : c'est cohérent avec un contenu injecté en JS, rien à changer ·
  bloquant : non
- **Général (branches / déploiement)** · L'US touche trois livrables : la migration (base de prod),
  l'admin (`feat/socle-v3`, déploiement Coolify manuel) et le site (`site-deploy`, worktree `C:/mdt-site`,
  auto-déployé au push sur `propulseo/main`). Les fichiers du site cités sont aujourd'hui identiques sur
  les trois branches. Les deux ordres de mise en ligne sont sans danger (clé absente = statique, élément
  absent = rien), mais l'US devrait le dire. La clé `confidentialite` diffère de l'URL
  `politique-de-confidentialite` : sans conséquence (l'admin n'associe pas page et URL), à garder
  cohérente avec `data-mdt-page` · bloquant : non

**Traitement (2026-10-08, rédacteur)** — bloquants : tests → hypothèse « tests » ajoutée ;
téléphone → ligne de contact sortie du champ, toujours synchronisée (Limites) ; texte vidé → CA-06
étendu ; ponctuation → CA-04 précisé. Non bloquants intégrés : Limites (gras/`.todo` perdus dès la mise
en ligne, repli assumé), CA-01 (libellés uniques, aide au masquage), CA-03 (lignes vides), hypothèses
(module séparé, conteneur `<div>`, enveloppes de section, liens exclus de la synchro, ordre de mise en
ligne). Écartés : limite de 4 000 caractères (sections < 600 caractères), nom de clé `confidentialite`
(sans conséquence).

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
- 2026-10-08 — v1 brouillon révisé après relecture (4 bloquants traités, voir « Relecture »).
