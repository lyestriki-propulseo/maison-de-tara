---
id: US-003
titre: Tara cadre ses photos avec un zoom, dans un aperçu qui a la forme réelle de l'emplacement
statut: en_construction
version: 2
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

**Exemple v2** : pour l'étape 01, Tara a mis une capture du calendrier de réservation, plus large
que l'arche. À 100 %, l'arche coupe les côtés (« …ter libre », le formulaire). Elle dézoome jusqu'à
« Photo entière » et fait glisser la capture tout en bas de l'arche : le haut arrondi est rempli du
crème de ses bords, la jonction ne se voit pas, et le calendrier est entier sur tous les écrans.

## Limites (ce que l'US ne fait PAS)

- ~~Pas de mode « image entière » avec fond autour~~ — retiré en v2 (Lyes, 14/10 après test en
  ligne : dézoom voulu). Le dézoom s'arrête à « photo entière visible » : pas de photo plus petite
  que ça au milieu du cadre.
- Couleur de remplissage **automatique** (couleur des bords de la photo), non modifiable par Tara
  (choix de Lyes du 14/10). Sur une vraie photo dont les bords ne sont pas unis, la bande de
  remplissage se verra : accepté.
- Pas de photo floutée en fond (option écartée par Lyes le 14/10).
- « Photo entière » = la photo tient dans le **rectangle** du cadre. Dans une arche, si Tara la laisse
  en haut, ses coins sont coupés par l'arrondi : elle le voit dans l'aperçu et peut la faire glisser
  vers le bas (choix de Lyes du 14/10).
- Photo avec transparence : la couleur de remplissage se voit à travers ; les nouvelles photos sont
  de toute façon réencodées en JPEG à l'envoi. Accepté.
- Sur les arches à passe-partout crème (Atelier), un remplissage crème efface la limite entre photo
  et passe-partout : accepté.
- Référence de cadrage = écran d'ordinateur de 1440 px (choix de Lyes du 14/10). À d'autres largeurs
  (1280, 1920 px, téléphone), le site garde le même centre et le même zoom, mais le bord visible peut
  varier un peu.
- Le fichier envoyé reste entier (réduit à 2 400 px comme aujourd'hui) ; le zoom est un réglage
  d'affichage, pas une découpe. À 300 % dans un grand cadre, une photo de petite taille peut paraître
  floue : accepté.
- La vignette de la liste Contenu ne montre pas le zoom (seul l'aperçu de cadrage le montre).
- Pas de retouche (rotation, luminosité, filtres).

## Critères d'acceptation

- **CA-01** — Étant donné une photo dans Contenu, quand Tara ouvre son cadrage, alors l'aperçu a la
  forme (rapport largeur/hauteur de la zone visible de la photo, arrondi compris pour les arches) de
  son emplacement sur le site à 1440 px, pour les 40 emplacements visibles. Les 6 photos de « Certaines
  réalisations » (section masquée) n'apparaissent plus dans Contenu tant que la section est masquée.
- **CA-02** (v2) — Étant donné une photo déjà en ligne, quand Tara ouvre son cadrage, alors elle peut
  zoomer de « Photo entière » à 300 % (curseur + boutons − / +) et faire glisser l'image, sans
  renvoyer le fichier. « Photo entière » est le plus petit zoom où toute la photo tient dans le
  rectangle du cadre ; c'est un **mode** (libellé « Photo entière » dans l'aperçu), pas un chiffre :
  il est recalculé pour chaque largeur d'écran. Entre « Photo entière » et 100 %, le zoom est un
  pourcentage. Sous 100 %, le glisser et les curseurs Position placent la photo dans le cadre (ex.
  tout en bas d'une arche).
- **CA-03** (v2) — Étant donné une nouvelle photo choisie sur son ordinateur, quand Tara la cadre
  avant l'envoi, alors elle dispose du même zoom (dézoom compris) et du même glisser, en repartant de
  100 %.
- **CA-04** — Étant donné un cadrage enregistré, quand un visiteur ouvre la page sur un écran de
  1440 px, alors la zone visible de la photo est la même que dans l'aperçu de l'admin (même zoom, même
  centre).
- **CA-05** (v2) — Étant donné n'importe quel zoom et n'importe quel déplacement, quand la photo
  s'affiche (admin ou site, à toutes les largeurs), alors : à 100 % et plus, elle remplit son cadre
  sans bande vide ; en dessous de 100 %, la partie du cadre non couverte par la photo est remplie de
  sa couleur de remplissage (CA-08), sans trou ni transparence, et la photo n'est jamais plus petite
  que « Photo entière » à la largeur affichée ; une photo en mode « Photo entière » est entière à
  toutes les largeurs (1280, 1440, 1920 px, téléphone). Dans tous les cas, ni la photo ni le remplissage ne
  débordent de l'emplacement (ni sur les éléments voisins, ni sur le liseré, le passe-partout ou le
  cadre).
- **CA-06** — Étant donné les photos déjà en ligne avant la livraison, quand la mise à jour est
  déployée, alors leur affichage ne change pas : même cadrage (dont les 2 photos déjà décalées de
  l'Accueil), mêmes arrondis, liserés et cadres dorés, mêmes effets de survol et d'apparition au
  défilement, même position (photo surélevée des privatisations comprise).
- **CA-07** — Étant donné un cadrage enregistré, quand Tara rouvre le cadrage de la même photo, alors
  elle retrouve le zoom et la position enregistrés (zoom inférieur à 100 % compris, v2).
- **CA-08** (v2) — Étant donné une photo dont Tara enregistre le cadrage (nouvelle ou déjà en
  ligne), quand l'enregistrement aboutit, alors une couleur de remplissage calculée automatiquement
  sur les 4 bords de la photo est enregistrée avec le cadrage, sans réglage de Tara. Mesure : sur le
  site à 1440 px, avec une image de test à fond uni versionnée dans le dépôt, l'écart moyen entre le
  remplissage et la photo, mesuré de part et d'autre de la jonction à 3 px de celle-ci, est inférieur
  à 3/255 par canal.

## Faits et hypothèses

- **Fait** (`app/src/components/admin/ContentImageField.tsx:210`) : l'aperçu de cadrage est un cadre
  fixe `aspect-[8/5]` (paysage) pour toutes les photos ; seul le glisser existe (`focus x/y`).
- **Fait** (`supabase/migrations/20260922140000_content_image_focus.sql`) : `content_blocks` stocke
  `image_focus_x` / `image_focus_y` (0-100, défaut 50) ; aucun zoom.
- **Fait** (`wandau-mdt/js/site-content.js:54`) : le site applique le cadrage par `object-position`
  seul ; les photos sont en `object-fit: cover`.
- **Fait** (relecture du 14/10, mesures navigateur à 1280/1440/1920/390 px) : 46 photos en base, 40
  emplacements visibles. 12 ont un cadre qui coupe au bord de la photo (5 arches Atelier, 7 cadres
  Boutique) ; 11 coupent mais avec un liseré autour (Parcours, Univers, Calendrier, Contact) ; 17 n'ont
  aucun parent qui coupe (photo du haut et galerie Boutique de l'Accueil, Occasions, photos
  privatisation de l'Atelier, Histoire). Plusieurs effets (survol, apparition, décalage de 14 px, cadre
  doré, arrondis) sont posés sur l'image elle-même. Aucune clé photo n'est affichée à deux endroits.
- **Fait** : le rapport largeur/hauteur de certains emplacements varie avec la largeur (photo du haut
  de l'Accueil : 0,92 à 1280 px, 1,02 à 1440 px, 1,37 à 1920 px).
- **Fait** : `app/src/lib/image-crop.ts` n'est utilisé nulle part (commentaire faux) ; les photos sont
  créées par les scripts `app/scripts/seed-content-*.mjs`, pas par migration ; 2 photos ont déjà un
  cadrage décalé (`accueil.hero.photo` 41/52, `accueil.parcours.04.photo` 57,27/71,45).
- **Fait** (mail de Tara du 10/10 + capture) : « est-ce possible d'ajouter un zoom in/out bouton ?
  Sinon chaque fois j'ajoute une photo impossible de régler correctement. »
- **Décision** (Lyes, 14/10) : zoom seul ; les 40 emplacements d'un coup ; aussi sur les photos déjà en
  ligne ; aperçu au format réel ; référence 1440 px ; photos « Certaines réalisations » cachées de
  l'admin tant que la section est masquée.
- **Hypothèse** : colonne `image_zoom` (défaut 1, contrainte 1-3). Le format de chaque emplacement
  (rapport à 1440 px, arche ou non) est déclaré dans le code de l'admin à partir des mesures du site
  (une table clé → format), pas en base, pour rester juste dans un environnement neuf.
- **Hypothèse** : côté site, chaque image éditable est placée dans une enveloppe qui coupe le
  débordement et porte les arrondis, liserés et cadres ; le zoom est appliqué avec la propriété
  `scale` (qui s'ajoute aux effets existants au lieu de les remplacer) et rien n'est posé à 100 %.
  28 emplacements sont retouchés (HTML + CSS).
- **Hypothèse** : un même calcul (zoom + position → zone visible) dans une fonction pure, utilisée
  par l'admin et reproduite à l'identique côté site ; `image-crop.ts` est supprimé ou branché.
- **Hypothèse (tests)** : fonction pure testée en Vitest ; CA-04 : mêmes données à 1440 px, zone
  visible comparée admin / site ; CA-05/06 : captures emplacement par emplacement sur le site local
  avec Supabase simulé (`pnpm e2e:site`), avant / après, avec les 2 cadrages décalés de prod et
  quelques survols ; CA-02/07 : e2e admin sur la prod selon le schéma « modifier puis remettre » de
  `contenu.e2e.ts`, zoom compris.

### Ajouts v2 (14/10)

- **Fait** (v1 en prod) : le rendu « zoom peint » (`js/image-zoom.js`, fond CSS de la balise <img>,
  taille « cover × zoom », zone de contenu) et la colonne `image_zoom numeric(4,2)` contrainte à
  `between 1 and 3` (migration `20261014120000`).
- **Fait** (requête du 14/10) : les 46 photos sont sur le stockage Supabase
  (`dpkykbqqgtpopdvtxlmo.supabase.co/storage/v1/object/public/medias/…`) ; leurs pixels sont
  lisibles depuis l'admin en mode CORS anonyme (prouvé par `e2e/contenu-photos-zoom.e2e.ts`).
- **Fait** (capture de Lyes du 14/10) : l'étape 01 de l'Atelier montre une capture du calendrier,
  fond crème uni, plus large que l'arche (0,741).
- **Hypothèse** : le zoom reste relatif à « la photo remplit le cadre » (1 = 100 %). « Photo
  entière » = rapport entre l'échelle « contain » et l'échelle « cover » du cadre à 1440 px, calculé
  dans l'admin à partir des dimensions de la photo et de la table des formats. La contrainte SQL
  passe à `image_zoom > 0 and image_zoom <= 3` (le minimum dépend de la photo).
- **Hypothèse** : nouvelle colonne `image_fill` (texte `#rrggbb`, vide = pas de remplissage),
  calculée dans l'admin à chaque enregistrement de cadrage (moyenne des pixels du pourtour de la
  photo, sur une copie réduite). Côté site, sous 100 % : un calque de couleur `image_fill` sous la
  photo, limité à la zone de contenu ; taille de la photo bornée à « photo entière » à la largeur
  affichée.
- **Décision** (Lyes, 14/10, après relecture v2) : mode « Photo entière » recalculé à chaque largeur ;
  sous 100 %, la photo se place dans le cadre (glisser + curseurs).
- **Hypothèse** (précisions de la relecture v2) :
  - mode « Photo entière » stocké `image_zoom = 0` ; contrainte remplacée (`drop constraint
    content_blocks_image_zoom_range`) par `image_zoom = 0 or (image_zoom > 0 and image_zoom <= 3)` ;
    un zoom intermédiaire est arrondi vers le bas et le site le remonte à « Photo entière » si besoin ;
  - `image_fill` NULL = aucune couleur (lignes v1) ; contrainte `image_fill ~ '^#[0-9a-f]{6}$'` ;
  - remplissage = calque d'image uni (dégradé d'une seule couleur) limité à la zone de contenu, posé
    seulement sous 100 % : rien ne change à 100 % et plus (CA-06, test « style exactement
    object-position » inchangé) ; si `image_fill` manque sous 100 %, crème du site `#FBF7EC` ;
  - couleur = moyenne des pixels d'une bande de 2 % (au moins 1 px) sur les 4 bords d'une copie
    réduite à 200 px, pixels à moins de 50 % d'opacité ignorés ; photo chargée en CORS anonyme dans
    l'admin (aujourd'hui `useImage` ne le fait pas) ; calcul impossible → `#FBF7EC` ;
  - dézoom désactivé tant que la photo de l'aperçu n'est pas chargée (minimum inconnu) ;
  - **déploiement** : migration, puis admin, puis site ; l'import de `image-zoom.js` dans
    `site-content.js` reçoit un suffixe de version (`?v=2`) pour ne jamais mélanger un nouveau
    `site-content.js` et un ancien `image-zoom.js` en cache (sinon tout le contenu retombe en
    statique) ;
  - **tests à refaire** : bornes de zoom (`image-zoom.test.ts` + jumeau site), « Dézoomer désactivé
    à 100 % » (`ContentImageField.test.tsx`), outil de comparaison `framing.ts` (dessiner
    remplissage + photo), e2e admin `afterAll` (remettre aussi `image_fill`) ; test CA-05 « zone dans
    la photo » à étendre.
- **Hypothèse (tests)** : mêmes preuves que v1 (calcul partagé, comparaison de pixels admin / site
  en zone visible ET en zone remplie), plus un test de la couleur des bords sur une image à fond uni
  et sur une image à bords contrastés.

## Relecture

Relecture du 14/10 (sous-agent, n'a pas participé à la rédaction). Mesures faites dans un vrai
navigateur sur le site local `C:/mdt-site` (build actuel, contenu de prod lu en anonyme) à 1280,
1440, 1920 et 390 px, plus une lecture de `content_blocks` (anonyme, lecture seule).

**Vérification des « Faits »**

- Fait 1 (`ContentImageField.tsx:210`, `aspect-[8/5]`) : exact. Petite nuance : en plus du
  glisser, il y a déjà deux curseurs « Position horizontale / verticale ».
- Fait 2 (migration focus) : exact.
- Fait 3 (`site-content.js:54`, `object-position` seul, `object-fit: cover`) : exact, les 38
  photos visibles mesurées sont toutes en `cover`.
- Fait 4 (`premium-atelier.css:144-145`) : exact. Les autres emplacements sont maintenant vérifiés
  (voir R1).
- Fait manquant : `app/src/lib/image-crop.ts` existe mais **n'est importé nulle part** (code mort).
  Son commentaire « Utilisé par ContentImageField » est faux. Il suit un autre modèle (zoom +
  décalage en pixels, recadrage « cuit » dans un canvas). Voir R6.
- Fait manquant : en prod, `content_blocks` a **46 lignes photo**, toutes avec une photo. Deux ont un
  cadrage déjà modifié : `accueil.hero.photo` (41/52) et `accueil.parcours.04.photo` (57,27/71,45).
  Les autres sont à 50/50.

**Constats**

| # | Critère visé | Problème | Bloquant |
|---|---|---|---|
| R1 | CA-05, CA-06, hypothèse `transform: scale()` | Sur les **40 emplacements visibles**, seuls **12** ont un parent qui coupe exactement au bord de la photo : les 5 arches de l'Atelier (`hero`, `ch01`-`ch04`) et les 7 cadres de la Boutique (`hero`, `galerie.01`-`06`). **11** ont un parent qui coupe, mais il est plus grand que la photo : il a un passe-partout (marge intérieure + bordure). Ce sont `accueil.parcours.01`-`04` (8 px + 1 px), `accueil.univers.*` (×3, environ 9 px), `calendrier.hero.photo1`-`3` (6 px + 1 px) et `contact.hero.photo` (bordure 1 px). Agrandie, la photo recouvrirait ce liseré. **17** n'ont aucun parent proche qui coupe : `accueil.hero.photo` (le cadre a 10 px de marge, la coupe se fait seulement au niveau du `header`), `accueil.boutique.photo1`-`3`, `accueil.occasions.photo1`-`5`, `atelier.priva.photo1`-`3`, `histoire.hero.photo_inde` et `photo_france` (coupe seulement au niveau de la `section`), `histoire.recit.photo1`-`3` (`span.cadre` avec 9 px de marge, sans `overflow`). Agrandies, ces photos déborderaient sur leurs voisines. Il faudra donc toucher le HTML et le CSS de 28 emplacements sur 40. L'US ne donne pas ce périmètre. | Oui : le périmètre du chantier site est sous-estimé. Il faut au minimum lister ces 28 emplacements et dire comment on les traite (enveloppe + coupe). |
| R2 | CA-06 | L'hypothèse `transform: scale()` en style inline écrase des `transform` déjà en place. (a) `atelier.priva.photo2` est surélevée par `translateY(-14px)` (`premium-atelier.css:550`). Un `scale(1)` inline la remettrait à plat : **changement visible**. (b) Les effets de survol disparaîtraient : `.arche:hover img` scale 1.035, `.piece:hover .cadre img` 1.06, `.arch:hover img` 1.04. (c) L'apparition au défilement du Parcours casserait : `scale(1.2)` puis `is-inview` → `scale(1)` (`style.css:2428-2472`). (d) Sur `atelier.priva.*`, le cadre doré (bordure + marge + fond) est **posé sur l'`<img>` lui-même** : agrandir l'image agrandirait le cadre. Il faut une enveloppe, ce qui casse au passage les sélecteurs `img:nth-child(2)` et la grille. (e) Beaucoup de formes d'arche viennent d'un `border-radius` posé sur l'`<img>` : univers, parcours, occasions, priva, `histoire.hero.photo_inde`, recit, calendrier. Agrandi, l'arrondi grossit aussi. Telle qu'écrite, l'hypothèse contredit CA-06. Pistes : ne rien poser quand zoom = 1, et/ou utiliser la propriété séparée `scale:`, qui se combine avec `transform` au lieu de l'écraser. Pour (d) et (e), l'enveloppe reste nécessaire. | Oui : CA-06 doit préciser que les effets existants (survol, apparition au défilement, décalage de la photo du milieu, cadres dorés) restent identiques. L'hypothèse technique doit être corrigée. |
| R3 | CA-01, CA-04 | La forme « ordinateur » n'est pas stable pour tous les emplacements. `accueil.hero.photo` vaut 0,92 à 1280 px, 1,02 à 1440 px et 1,37 à 1920 px. `accueil.parcours.*` vaut 0,96 de 1280 à 1440 px puis 1,08 à 1920 px (hauteur en `clamp(300px, 24vw, 420px)`). Tous les autres sont stables de 1280 à 1920 px. CA-04 (« visiteur … ordinateur ») est donc faux à 1920 px pour l'accueil. Il faut fixer la largeur de référence (1440 px, comme l'hypothèse) **dans le critère** et accepter l'écart ailleurs, comme pour le téléphone. | Oui pour la recette : on ne peut pas prouver CA-04 sans une largeur fixée. |
| R4 | CA-01 | 6 photos de l'admin n'ont **aucun emplacement visible** : `accueil.realisations.photo1`-`6`. Elles sont en base, mais la section est masquée dans `index.html:244` (partiel `_partials/realisations.html`). « La forme de l'emplacement de cette photo » n'existe pas pour elles. De plus, `boutique.galerie.05` et `06` sont masquées tant que leur titre est vide (`data-mdt-hide-if-empty`) : on ne peut pas les mesurer en l'état. Leurs classes donnent quand même la forme : portrait 0,75 et paysage 1,6. | Oui, mais une décision en une ligne suffit : rapport du partiel, ou photos retirées de l'admin. |
| R5 | CA-01 | « Forme » = seulement le rapport largeur/hauteur ? L'exemple dit « l'aperçu a la forme de l'arche ». Avec un simple rectangle, Tara verrait les coins que l'arche coupe et pourrait y placer un sujet important. Il faut aussi préciser **quelle boîte on mesure** : la photo elle-même, pas la `figure` ou le cadre avec passe-partout (écarts de 2 à 20 px mesurés). Pour le Parcours, il faut mesurer sans le `scale(1.2)` d'apparition. | Non, mais à trancher pour pouvoir recetter CA-01. |
| R6 | CA-03 | `image-crop.ts` (mort) propose de « cuire » le recadrage dans le fichier envoyé. S'il est réutilisé ainsi, deux problèmes. Le fichier serait coupé au rapport ordinateur : le téléphone, dont la forme diffère, perdrait des parties de la photo. Et le zoom enregistré serait appliqué une seconde fois sur le site. L'US doit dire que le fichier reste entier (`imageToDataUrl`) et que le zoom est stocké à part. Elle doit aussi dire quoi faire de `image-crop.ts` : réutiliser seulement les maths, ou le supprimer (règle « pas deux modèles qui cohabitent »). Il faut aussi préciser que choisir un nouveau fichier remet le zoom à 100 %, comme le centre est remis à 50/50. | Non |
| R7 | CA-02/03 | Qualité : l'envoi réduit la photo à 2 400 px au maximum (`MAX_IMAGE_SIDE`). À 300 % dans un grand cadre (Boutique 600×820 px CSS, donc environ 1 640 px réels sur écran Retina), il reste environ 800 px utiles : la photo sera floue. À accepter ou à borner. | Non |
| R8 | CA-04 | Le calcul sera écrit **deux fois** : en TypeScript côté admin et en JS simple côté site (autre branche, pas de module partagé). La « fonction pure testée » ne couvre qu'un côté. Bon point : avec `object-position: x% y%` et `transform-origin: x% y%`, le point à x % du cadre montre le point à x % de l'image. Un même CSS donne donc le même rendu, à rapport égal. Preuve proposée : mêmes données (rapport, zoom, centre, photo de test) côté admin (aperçu) et côté site (`pnpm e2e:site`, Supabase simulé, 1440 px). On compare la zone visible calculée (`getBoundingClientRect` de l'image et du cadre, `transform` calculé), ou une capture du cadre ramenée à la même largeur, avec une tolérance. À écrire dans l'US, sinon CA-04 restera « à l'œil ». | Non, mais à préciser |
| R9 | CA-06 | Les « captures avant / après sur toutes les pages » seront instables : contenu chargé après coup, Locomotive, apparitions au défilement, images en `loading="lazy"`. Il faut faire les captures sur le site **simulé** avec des lignes figées, inclure les deux cadrages non centrés de prod (`accueil.hero` 41/52, `parcours.04` 57,27/71,45), faire défiler jusqu'à chaque emplacement et capturer emplacement par emplacement. Ajouter un état « survol » sur une arche de l'Atelier, un cadre de la Boutique et une arche du Calendrier, puisque R2 vise ces effets. | Non, mais à préciser |
| R10 | Hypothèse colonne `image_ratio` | Les lignes photo ne viennent pas des migrations mais des scripts `app/scripts/seed-content-*.mjs`. Une migration `update … where field_key = …` remplit bien la prod. Mais un environnement neuf (migrations puis seeds) aurait des rapports vides si les seeds ne sont pas mis à jour. Autre point : le rapport est une copie du CSS du site. Si le CSS change, l'aperçu se trompe sans rien signaler. Alternative : une table de correspondance `field_key → rapport` dans le code admin. Les deux se valent, mais il faut le noter. | Non |
| R11 | CA-02, CA-07 | « e2e admin en lecture seule » est impossible : enregistrer puis rouvrir un zoom implique d'écrire en base. Or l'e2e admin tourne sur la **base de prod** (`app/.env`). Il faut reprendre le schéma de `contenu.e2e.ts` (modifier puis remettre à l'identique dans `afterAll`), en y ajoutant `image_zoom`. | Non |
| R12 | CA-01/07 (confort) | La vignette de l'admin (112×80 px, `object-position` seul) ne montrera pas le zoom. Tara verra une vignette différente de son cadrage. À aligner ou à assumer. Par ailleurs, l'aperçu limité à 440 px de large fera environ 620 px de haut pour `histoire.hero.photo_inde` (0,71) : prévoir une hauteur maximale. | Non |

**Photos affichées à plusieurs endroits** : aucune clé photo n'apparaît deux fois sur le site. Un
même fichier par défaut sert à plusieurs clés, mais chaque emplacement a sa propre ligne et sa
propre forme. Pas de conflit.

**Verdict** : l'US n'est pas constructible en l'état. Il faut d'abord régler R1 (périmètre des 28
emplacements à envelopper), R2 (CA-06 doit garder les effets existants, hypothèse `transform` à
corriger), R3 (largeur de référence 1440 px dans CA-01/CA-04) et R4 (décision sur les 6 photos
« réalisations »). Le reste se traite en précisions.

**Traitement (2026-10-14, rédacteur)** — bloquants : R1 → CA-05 et hypothèse « enveloppe » (décision de Lyes : les 40 emplacements d'un coup) ; R2 → CA-06 détaillé + propriété `scale` ; R3 → référence 1440 px (décision de Lyes, Limites + CA-01/04) ; R4 → réalisations cachées de l'admin (décision de Lyes, CA-01). Intégrés : R5 (CA-01), R6 (Limites, CA-03, hypothèse image-crop), R7 et R12 (Limites), R8 et R9 (tests), R10 (format déclaré dans le code), R11 (tests).

**Relecture v2** (sous-agent neuf, 14/10) : 12 constats, 2 bloquants — « photo entière » aux autres
largeurs (#1) et arche qui coupe une photo entière (#2) → tranchés par Lyes (mode recalculé ; photo
déplaçable, « entière » = rectangle). Précisions intégrées : glisser dans la bande (#3), calque limité
à la zone de contenu (#4), transparence (#5), méthode de couleur (#6), CORS dans l'admin (#7),
mesure de CA-08 (#8), ordre de déploiement et cache des modules (#9), contrainte et arrondis (#10),
dézoom avant chargement (#11), tests à refaire (#12).

## Recette v1

Recette du 14/10 (construction : admin `04e7c77` → `f37eae2`, site `5fa07f3` + `f9ca6ca`). Preuves en
local : site servi depuis `C:/mdt-site` avec Supabase simulé (`pnpm e2e:site`, 27 ✓, 5 passes
complètes vertes), admin local sur la base de prod (`contenu*.e2e.ts`, 9 ✓, base remise à
l'identique et vérifiée), Vitest 139 ✓, `node --test` site 16 ✓, `tsc` et `eslint` propres.
**Pas encore déployé** : contrôle en prod à faire après la mise en ligne.

**Écart à l'hypothèse technique (choix de Lyes du 14/10, pendant la construction)** : pas
d'enveloppe autour des 28 photos. Au-delà de 100 %, `js/image-zoom.js` peint la photo agrandie en
fond de la balise `<img>` elle-même (« cover × zoom » au point de focus, limité à la zone de
contenu) et retire la photo normale une fois tout chargé. Aucun HTML ni CSS de page touché ; à
100 %, rien n'est posé. Les critères sont inchangés.

| Critère | Preuve (test, capture, requête) | Commit | État |
|---|---|---|---|
| CA-01 | `e2e-site/photos-zoom.e2e.ts` « CA-01 — la table des formats… » : les 40 emplacements mesurés à 1440 px = `content-image-formats.ts` (rapport ±1 %, arche) ; `ContentImageField.test.tsx` CA-01 ; `e2e/contenu-photos-zoom.e2e.ts` CA-01 (aperçu 0,741 en arche, 0 photo dans « Certaines réalisations ») ; capture de l'aperçu admin | 56221a4, 0584321 | ok |
| CA-02 | `image-zoom.test.ts` CA-02 (bornes, glisser) ; `ContentImageField.test.tsx` CA-02 (− / + / curseur, `onSave` jamais appelé) ; e2e admin CA-02 (zoom 240 % enregistré, `image_path` inchangé en base) | 04e7c77, 56221a4 | ok |
| CA-03 | `ContentImageField.test.tsx` CA-03 ; e2e admin CA-03 (nouveau fichier : 100 %, zoom 180 % rendu juste, annulé sans envoi) | 56221a4 | ok |
| CA-04 | Comparaison de pixels écran ↔ calcul `visibleArea` de l'admin : site (galerie Boutique 180 %, arche Atelier 240 %, écart moyen ≈ 0,03/255, seuil 6 ; témoins faux zoom/focus > 6) et aperçu admin (même mesure) ; cas partagés `image-zoom.test.ts` ↔ `tests/image-zoom.test.mjs` | 04e7c77, 5fa07f3, b3b62c4, 4e2f3d6 | ok (local) |
| CA-05 | `image-zoom.test.ts` CA-05 (zone toujours dans la photo) ; e2e-site CA-05 : 300 % rendu juste à 1280 / 1920 / 390 px, boîte inchangée et passe-partout gardé (`content-box`), rien de peint avant le chargement de la nouvelle photo (réponse lente) ; URL échappée (`tests/image-zoom.test.mjs`) | 5fa07f3, f9ca6ca, f37eae2 | ok (local) |
| CA-06 | e2e-site CA-06 : 40 photos à 100 % ou sans `image_zoom` (dont 41/52 et 57,27/71,45) → style exactement `object-position: x% y%`, rien d'autre ; zoomées : décalage −14 px et survol 1,035 conservés | 5fa07f3, b3b62c4 | ok (local) |
| CA-07 | `ContentImageField.test.tsx` CA-07 ; e2e admin : après enregistrement et rechargement, 240 % / 65 / 20 retrouvés | 56221a4, 4e2f3d6 | ok |

**Relecture du code** (sous-agent neuf, 14/10) : aucun bloquant. Corrigé : fond pouvant apparaître
un instant à la mauvaise taille avant chargement (f9ca6ca), fichier > 200 lignes (eb73b71), témoins
négatifs ajoutés (f37eae2). **Limites acceptées à valider par Lyes** : une photo zoomée est un fond
CSS → elle ne s'imprime pas si l'impression des arrière-plans est désactivée, et « enregistrer
l'image » donne le fichier entier ; le fond des photos zoomées se charge sans attendre le défilement.

**Idées hors mandat** (non faites) : masquer aussi les 2 textes de « Certaines réalisations » ;
vignette de la liste montrant le zoom.

## Historique

- 2026-10-14 — v1 brouillon (mail de Tara du 10/10 ; choix de Lyes du 14/10 : zoom seul, toutes les
  photos, photos déjà en ligne comprises, aperçu au format réel).
- 2026-10-14 — v1 révisée après relecture et décisions de Lyes (40 emplacements, 1440 px, réalisations cachées).
- 2026-10-14 — v1 validée par Lyes (réponse « Validée », dans la conversation).
- 2026-10-14 — construite (rendu « zoom peint », choix de Lyes) et vérifiée en local ; migration `image_zoom` en prod. Pas encore déployée.
- 2026-10-14 — v1 déployée en prod (site 3b79024, admin 0f45105), non encore acceptée.
- 2026-10-14 — v2 brouillon : dézoom jusqu'à « photo entière », vide rempli de la couleur des bords
  (demande de Lyes après test en ligne, capture du calendrier dans l'arche de l'étape 01 ; choix
  « couleur des bords auto »). CA-02, CA-03, CA-05, CA-07 reformulés, CA-08 ajouté.
- 2026-10-14 — v2 relue (sous-agent neuf), décisions de Lyes intégrées (mode « Photo entière »
  recalculé, photo déplaçable dans la bande).
- 2026-10-14 — v2 validée par Lyes (réponse « oui construit là et met en ligne », dans la conversation) ; construction lancée.
