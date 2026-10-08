---
id: US-001
titre: Tara modifie elle-même les conditions d'annulation affichées au moment de réserver
statut: verifiee
version: 2
projet: Maison de Tara (site + admin)
---

# US-001 — Tara modifie elle-même les conditions d'annulation affichées au moment de réserver

## L'histoire

**En tant que** Tara, gérante de la Maison de Tara, connectée à l'admin,
**je veux** écrire moi-même le texte des conditions d'annulation qui s'affiche sous le paiement dans le
formulaire de réservation, avec un texte pour les ateliers et un autre pour les événements,
**afin de** annoncer ma vraie règle (pas de remboursement, report possible) sans dépendre de Propulseo.

**Exemple concret** : le jeudi 8 octobre, Tara ouvre l'admin, va dans Contenu, choisit la page Atelier
et remplace le texte « Conditions d'annulation — atelier libre » par « Modification de la date ou de
l'horaire possible jusqu'à 48 h avant votre créneau. Passé ce délai, l'acompte reste acquis. »
Elle enregistre. Un client qui ouvre la page Atelier et choisit « Atelier libre » lit cette phrase sous
le texte de l'acompte. S'il choisit « Événement », il lit à la place le texte prévu pour les événements.

## Limites (ce que l'US ne fait PAS)

- Ne change pas la règle de paiement : aucune annulation ni remboursement en libre-service. Seul cas de
  remboursement existant, inchangé : le remboursement automatique quand la place a été prise entre-temps
  (`app/src/routes/api.webhooks.stripe.ts:49-57`). Un texte de Tara du type « aucun remboursement » ne
  vise pas ce cas (à lui signaler).
- Ne rédige pas le texte final à la place de Tara : le texte de départ reprend ses propres mots (mail du
  08/10), elle le complète.
- Texte brut, sur un seul paragraphe : pas de gras ni de lien, et les retours à la ligne saisis
  deviennent des espaces (comme le reste de l'écran Contenu).
- Ne touche pas aux emails de confirmation (ils ne parlent pas d'annulation).
- Aucun changement de code dans l'admin : l'écran Contenu est générique (regroupe par `section`, trie
  par `sort_order`).

## Critères d'acceptation

- **CA-01** — Étant donné Tara connectée, quand elle ouvre Contenu › Atelier, alors elle voit dans le
  groupe « Réservation », après les champs existants, trois nouveaux champs : « Conditions d'annulation —
  atelier libre (laisser vide pour ne rien afficher) », préremplie avec « Modification de la date ou de
  l'horaire possible jusqu'à 48 h avant votre créneau. » ; « Conditions d'annulation — événement
  (laisser vide pour ne rien afficher) », vide ; « Paiement — événement », prérempli avec le texte
  actuel « Le prix de l'événement est réglé en totalité en ligne, par carte bancaire. ».
- **CA-02** — Étant donné un champ de conditions modifié et enregistré, quand un visiteur ouvre (ou
  recharge) la page Atelier dans le mode correspondant, alors il lit le nouveau texte sous la mention du
  paiement. La phrase « …le paiement de réservation est remboursé » n'apparaît plus jamais, même un
  instant au chargement (elle n'est plus dans le HTML).
- **CA-03** — Étant donné le formulaire de réservation, quand le visiteur bascule entre « Atelier libre »
  et « Événement », ou qu'il arrive par un lien `/atelier?event=<id>` (calendrier), alors seul le texte
  de conditions du mode affiché est visible, quel que soit l'ordre de réponse des requêtes.
- **CA-04** — Étant donné un champ de conditions vide, quand le visiteur affiche le mode correspondant,
  alors aucune ligne de conditions n'apparaît.
- **CA-05** — Étant donné la base de production, quand on ajoute les nouveaux champs, alors aucun texte
  ou photo déjà présent dans Contenu n'est modifié (seules les nouvelles lignes apparaissent).
- **CA-06** — Étant donné Supabase injoignable, quand le visiteur ouvre la page Atelier, alors aucune
  ligne de conditions ne s'affiche (jamais l'ancienne phrase « remboursé »).
- **CA-07** — Étant donné le champ « Paiement — événement » modifié et enregistré, quand le visiteur
  passe en mode « Événement » sans avoir choisi d'événement (ou choisit un événement sans prix
  payable), alors il lit le nouveau texte ; quand il choisit un événement avec un prix, la phrase
  automatique « Paiement en ligne de X € par personne… » le remplace, comme aujourd'hui (v2).

## Faits et hypothèses

- **Fait** (`wandau-mdt/_src/atelier.html:180`) : le texte est codé en dur dans
  `<p class="refund-policy">`, sans `data-mdt-content`, et s'affiche dans les deux modes.
- **Fait** (`_src/atelier.html:175,179`, `js/site-booking.js:33-34,164`) : la mention de paiement
  existe déjà en deux versions (`#rf-acompte-atelier` / `#rf-acompte-evenement`), basculées par
  `toggleMode()`, appelé au changement de mode ou à la présélection `?event=`, jamais à l'initialisation
  (le bloc événement est donc `hidden` dans le HTML).
- **Fait** (`js/site-content.js:87-100`) : un champ vide en base laisse le HTML statique affiché ; le
  mécanisme `data-mdt-hide-if-empty` (l. 134-139) retire l'élément si le champ témoin est vide, **et
  force `hidden = false`** s'il est rempli (clé absente de la base → rien ne change).
- **Fait** (lecture anon de la prod, relecture du 08/10) : `atelier.reserve.acompte_evenement` n'a
  aucune ligne en base (non modifiable dans l'admin) ; le groupe « Réservation » de la page `atelier`
  occupe les `sort_order` 24-27 ; `unique (page, field_key)` existe.
- **Fait** (mail de Tara du 08/10/2026) : « Je ne veux pas d'annulation, je ne veux pas rentrer dans
  l'histoire de remboursements […] modification des dates/horaires possible jusqu'à 48 h avant votre
  créneau, passé ce délai… » (phrase inachevée).
- **Fait** (`supabase/migrations/20260828100000_content_blocks_global_coords.sql`) : précédent d'ajout de
  champs de contenu par migration `insert`.
- **Décision** (Lyes, 08/10) : rien en dur dans le HTML pour les conditions ; texte de départ = les mots
  de Tara pour l'atelier, vide pour l'événement ; « Paiement — événement » ajouté à l'US.
- **Hypothèse** : page `atelier`, section exactement `'Réservation'`, `sort_order` distincts après les
  existants ; clés `atelier.reserve.conditions`, `atelier.reserve.conditions_evenement`,
  `atelier.reserve.acompte_evenement` ; migration `insert … on conflict (page, field_key) do nothing`.
  Les clés ne sont **pas** ajoutées à `seed-content-atelier.mjs` (son upsert écraserait les textes de
  Tara s'il était relancé). Apostrophes échappées en SQL, espace insécable (U+00A0) dans « 48 h ».
- **Hypothèse** : chaque condition = une enveloppe qui bascule (id, `hidden` géré par `toggleMode()`)
  contenant un élément porteur de `data-mdt-content` + `data-mdt-hide-if-empty`, vide dans le HTML et
  sans `hidden` propre. Ainsi `site-content.js` ne peut pas réafficher le texte d'un autre mode (CA-03).
  Rien n'est imbriqué dans `#rf-acompte-atelier`, qui porte lui-même `data-mdt-content`.
- **Hypothèse (tests)** : la seule base est la prod → CA-02/03/04/06/07 prouvés par un test Playwright
  sur le site servi en local, réponses `content_blocks` simulées (`page.route` : rempli, `null`, requête
  coupée, réponse retardée pour la course de CA-03). CA-05 : instantané `select page, field_key,
  text_value, image_path, updated_at from content_blocks` avant/après la migration → seulement 3 lignes
  en plus, aucun `updated_at` modifié. CA-01 : recette à l'écran de l'admin.
- **Hypothèse (mise en ligne)** : site modifié dans le worktree `C:/mdt-site` (branche `site-deploy`),
  `node build.mjs` puis commit du `atelier.html` buildé ; la copie `wandau-mdt/` de `feat/socle-v3` n'est
  pas éditée à la main (elle arrive par fusion). Ordre : site d'abord (la phrase « remboursé » disparaît,
  rien ne s'affiche tant que les lignes n'existent pas), puis migration. Pas de redéploiement de l'admin.
  Recette de CA-02 en fenêtre privée (nginx ne fixe pas de `Cache-Control` pour le HTML).

## Questions ouvertes

Aucune côté construction. À demander à Tara, pour l'aider à rédiger son texte (hors US) : que se
passe-t-il « passé ce délai » (acompte perdu ?), et quelle règle pour un événement payé en entier ?
À lui signaler aussi : le texte « Acompte — atelier libre » en base date du 19/08 (« Un acompte de 6 € …
est demandé pour confirmer… ») ; il reste juste, mais c'est lui qui s'affiche, pas celui du HTML.

## Relecture

- **CA-03 / Fait `site-content.js:134-139`** · Le Fait est incomplet : `data-mdt-hide-if-empty` ne fait pas que retirer l'élément, il **force aussi `el.hidden = false`** quand le champ est rempli (c'est ainsi que la boutique révèle les vignettes 05-06, qui sont `hidden` au départ). Si on pose cet attribut sur un élément que `toggleMode()` cache avec `hidden` (le texte « événement » doit être `hidden` au chargement), `site-content.js` le réaffiche après son fetch → les deux textes sont visibles en mode atelier. Il y a aussi une course : en arrivant par `/atelier?event=<id>` (lien du calendrier, `site-events.js:83`), `toggleMode()` part après le fetch des disponibilités, et le fetch du contenu peut répondre après et réafficher le texte « atelier ». Il faut que l'US impose de séparer « l'élément qui bascule » (enveloppe avec id, cachée par `toggleMode`) de « l'élément porteur de `data-mdt-content` + `hide-if-empty` » (sans `hidden`). Piège voisin : ne pas imbriquer le texte dans `#rf-acompte-atelier`, qui porte lui-même `data-mdt-content` (son `textContent` écraserait les enfants) · bloquant : oui
- **CA-04 / CA-06 / Questions ouvertes** · Le repli statique garde la phrase « … le paiement de réservation est remboursé », puisque l'US reprend le texte actuel. Deux conséquences. (a) À chaque chargement, cette phrase est visible jusqu'au retour du fetch `content_blocks`. Or de nombreux boutons arrivent directement sur `/atelier#reserver` (header ×2, accueil ×4, contact ×2, histoire, calendrier) : le visiteur voit donc « remboursé » s'afficher brièvement avant le texte de Tara, ou avant que la ligne disparaisse. (b) Si Supabase est injoignable (CA-06), « remboursé » revient même si Tara a vidé le champ ou écrit « pas de remboursement ». CA-04 (« l'ancien texte ne revient pas ») et CA-06 se contredisent donc. Il faut une décision : quel texte statique garder (l'actuel, un texte neutre, le texte final de Tara une fois écrit, ou rien jusqu'au chargement) ? Il faut aussi que CA-04 précise « une fois le contenu chargé ». La mention « Aucune question côté construction » est donc inexacte · bloquant : oui
- **Limites** · Le Fait « aucun remboursement automatique n'existe » est faux. Le webhook Stripe rembourse automatiquement quand la place a été prise entre-temps (`app/src/routes/api.webhooks.stripe.ts:49-57`, testé dans `api.webhooks.stripe.test.ts:96`). Ce n'est pas une annulation client, mais un texte de Tara du type « aucun remboursement » contredirait ce cas. Il faut corriger la Limite et le signaler à Tara · bloquant : non
- **CA-01 / Hypothèse migration** · Il manque des précisions pour la migration. `section` doit valoir exactement `'Réservation'` (valeur en prod) pour que les champs rejoignent les 4 autres du groupe. Les `sort_order` doivent être distincts et placés après 27 (Réservation = 24-27, Privatisation commence à 28). C'est la colonne `label` qui porte le nom affiché. L'écran Contenu est générique (`contenu.tsx` regroupe par `section` et trie par `sort_order`) : aucun changement de code admin n'est nécessaire, et l'US gagnerait à le dire. Vérifié en prod (lecture anon) : les clés `atelier.reserve.conditions*` n'existent pas encore, et `unique (page, field_key)` existe, donc `on conflict (page, field_key) do nothing` est valide · bloquant : non
- **CA-01** · Le texte statique contient `&nbsp;` (« 48&nbsp;h », « créneau&nbsp;: ») et une apostrophe. Dans le SQL, il faut un U+00A0 (sinon « 48 / h » peut se couper en fin de ligne) et échapper `'`. À noter : dès qu'une valeur existe en base, toute correction ultérieure du HTML statique est masquée. Précédent constaté en prod (hors US, à signaler) : `atelier.reserve.acompte` affiche encore le texte du seed du 19/08 (« Un acompte de 6 € … est demandé pour confirmer… »), alors que le HTML a été mis à jour après le passage à Stripe. Et `atelier.reserve.acompte_evenement` n'a aucune ligne en base, donc ce texte n'est pas modifiable dans l'admin · bloquant : non
- **CA-02 / CA-04 / CA-06 (vérification)** · Il n'y a qu'une base, celle de prod (les tests e2e tournent contre la prod, cf. `playwright.config.ts`, et le site local lit aussi la prod via `supabase-config.js`). Vérifier CA-02 ou CA-04 « pour de vrai » revient à modifier ou vider un texte visible des visiteurs. L'US doit dire comment prouver ces critères : par exemple Playwright sur le site local avec `page.route` qui simule la réponse `content_blocks` (rempli, `text_value: null`, requête interrompue pour CA-06), plus une seule vérification réelle en prod suivie d'une remise en état · bloquant : non
- **CA-05 (preuve)** · Il faut préciser la preuve attendue. Exemple : instantané `select page, field_key, text_value, image_path, updated_at from content_blocks` avant et après → seulement 2 lignes en plus, aucun `updated_at` modifié. Il faut aussi préciser de **ne pas** ajouter les 2 clés à `seed-content-atelier.mjs` : son upsert écraserait le texte de Tara si quelqu'un relançait le script · bloquant : non
- **CA-03 (cas d'arrivée)** · `toggleMode()` n'est appelé qu'au changement de mode ou en cas de présélection `?event=`, jamais à l'initialisation. Le texte « événement » doit donc être `hidden` dans le HTML. Au rechargement, Firefox restaure le bouton « Événement » coché sans rebasculer l'affichage (défaut qui existe déjà pour l'acompte, donc « même comportement »). Ajouter à la recette le cas « arrivée par `/atelier?event=<id>` » → seul le texte événement visible · bloquant : non
- **CA-04 (sens de « vide »)** · Partout ailleurs dans l'écran Contenu, vider un champ revient au texte statique par défaut (`site-content.js:95`). Pour ces 2 champs, vider = masquer la ligne. Tara n'a aucun moyen de le savoir : prévoir un libellé du type « (laisser vide pour ne rien afficher) ». Côté admin, c'est compatible : `''` est enregistré en `null` (`content-data.ts:52`), et `hide-if-empty` retire bien la ligne pour un `null` · bloquant : non
- **Limites (texte brut)** · Les retours à la ligne saisis par Tara disparaissent : `applyText` en mode par défaut fait un `textContent`, les sauts de ligne se fondent en espaces. Soit le préciser dans le libellé, soit utiliser un mode existant · bloquant : non
- **Général (où et quand)** · Le site se modifie dans le worktree `C:/mdt-site` (branche `site-deploy`), mais `wandau-mdt/` existe aussi sur `feat/socle-v3` (même contenu aujourd'hui, à part les fins de ligne CRLF) : préciser où éditer pour éviter deux copies divergentes et des conflits sur `propulseo/main`. Préciser aussi l'ordre de mise en ligne : site d'abord (ou en même temps), puis migration. Si la migration passe d'abord, Tara voit les champs mais ses modifications sont sans effet sur le site. Aucun redéploiement de l'admin n'est nécessaire. Ne pas oublier `node build.mjs` et de committer `atelier.html` buildé · bloquant : non
- **Cache** · Le contenu est lu avec `cache: 'no-store'` (`site-content.js:113`), donc une modification de Tara est visible au chargement suivant : CA-02 est OK. En revanche, `deploy/nginx.conf` ne fixe pas de `Cache-Control` pour le HTML : juste après le déploiement du site, un visiteur récent peut recevoir l'ancien `atelier.html` depuis le cache de son navigateur. Faire la recette de CA-02 avec un rechargement ou une fenêtre privée · bloquant : non
- **Faits** · Vérifiés exacts : `_src/atelier.html:180` (texte en dur, sans `data-mdt-content`, visible dans les deux modes), `site-booking.js:33-34,164`, `site-content.js:87-100`, la migration `20260828100000` (un `insert` simple, sans `on conflict`) et le seed (upsert qui écrase). Écarts mineurs : « `atelier.html:174-179` » désigne le fichier `_src` (lignes 175 et 179 ; le fichier buildé est aux lignes 368-373). Le mail de Tara du 08/10 n'est pas dans le dépôt (non vérifiable) · bloquant : non

**Traitement (2026-10-08, rédacteur)** — bloquants : bascule de mode → hypothèse « enveloppe qui
bascule / élément porteur » + CA-03 précisé (arrivée `?event=`, ordre des requêtes) ; phrase
« remboursé » en repli → décision de Lyes (rien en dur, texte de départ = mots de Tara), CA-02, CA-04 et
CA-06 réécrits. Non bloquants intégrés : Limites (remboursement automatique existant, texte sur un seul
paragraphe, pas de code admin), CA-01 (section, ordre, libellés « laisser vide »), hypothèses (migration,
pas d'ajout au seed, tests et preuve de CA-05, worktree et ordre de mise en ligne, cache). Ajout décidé
par Lyes : « Paiement — événement » modifiable (CA-07).

## Recette

| Critère | Preuve (test, capture, requête) | Commit | État |
|---|---|---|---|
| CA-01 | `app/e2e/contenu-conditions.e2e.ts` « CA-01 — … » contre l'admin de prod (08/10, ok) | a65f789 | ok |
| CA-02 | `app/e2e-site/reservation-conditions.e2e.ts` « CA-02 — … » ; prod 08/10 : « rembours » absent de /atelier (HTML et page rendue), texte de Tara affiché | 7b00d17, bb9fd21 | ok |
| CA-03 | 3 tests « CA-03 — … » (bascule ; arrivée `?event=` contenu avant / après les disponibilités) ; prod : texte atelier masqué en mode Événement | 7b00d17 | ok |
| CA-04 | « CA-04 — champ vidé… » ; prod : `conditions_evenement` vide → élément retiré | 7b00d17 | ok |
| CA-05 | Photo `content_blocks` avant / après migration (08/10) : 198 → 235 lignes, 37 nouvelles, **0 modifiée, 0 supprimée** | a65f789 | ok |
| CA-06 | « CA-06 — Supabase injoignable… » (requêtes coupées) | 7b00d17 | ok |
| CA-07 | « CA-07 — « Paiement — événement »… » ; prod : texte visible en mode Événement | a65f789, 7b00d17 | ok |

## Historique

- 2026-10-08 — v1 brouillon (demande de Tara par mail du 08/10 ; choix de Lyes : deux textes, un par mode).
- 2026-10-08 — v1 brouillon révisé après relecture : rien en dur, texte de départ = mots de Tara (décision
  de Lyes) ; ajout de CA-07 « Paiement — événement » (décision de Lyes).
- 2026-10-08 — v1 validée par Lyes (« je valide », dans la conversation).
- 2026-10-08 — suspendue au démarrage de la construction : CA-07 décrit mal le comportement actuel (`site-booking.js:151-162` : dès qu'un événement avec prix est choisi, la phrase automatique « Paiement en ligne de X € par personne… » **remplace** le texte éditable, elle ne le suit pas). Version 2 proposée à Lyes.
- 2026-10-08 — v2 : CA-07 reformulé pour décrire le comportement actuel (texte remplacé par le montant une fois l'événement choisi). Validée par Lyes (choix « Comme aujourd'hui », dans la conversation).
- 2026-10-08 — construite et vérifiée (tous les critères prouvés), **en production le 08/10** (site a9f1688, migration 20261008120000, admin fe86153). En attente de l'acceptation de Lyes. Constat hors US : Cloudflare met JS/CSS en cache 4 h (`max-age=14400`) → un visiteur venu dans les 4 h précédant un déploiement peut avoir l'ancien script avec la nouvelle page, le temps que son cache expire.
