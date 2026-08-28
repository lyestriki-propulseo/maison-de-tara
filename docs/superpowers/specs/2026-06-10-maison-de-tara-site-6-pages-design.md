# Maison de Tara — Site 6 pages : Design & Spécification

> Spec validée le 2026-06-10 (brainstorming) puis **durcie par audit adversarial 5-lentilles** le même jour.
> Boussole pour la construction. Projet client Propulseo.
> Décisions actées : **6 pages · configurateur couleur live · statique + partials · couleur d'abord**.

---

## 1. Contexte & objectif

**Maison de Tara** : atelier de peinture sur céramique + café + boutique déco, à La Garenne-Colombes (92). Ouverture **automne 2026**.

Aujourd'hui le projet est un **one-page** (`wandau-mdt/index.html`, template « Wandau » partiellement adapté MDT). On a vendu à Tara un **site multi-pages**. On construit donc un **site 6 pages** :

1. **Accueil** · 2. **L'Atelier** (comment ça se passe + réservation) · 3. **La Boutique** · 4. **Le Calendrier** (agenda mensuel) · 5. **Notre Histoire** · 6. **Contact**

**Sources de vérité du contenu V1 :**
- **49 retours Pastel** (canvas `922080`, tous `active`), **numérotés #2 → #50** (il n'y a pas de #1 ; #50 inclus) → `Pastel Auto-Fix/annotations-tara-922080.json` (dossier `Interne Propulseo/`).
- **2 documents Tara** : `1 - Retours Tara/R1/page contact.pptx` (4 slides) + `page boutique.pptx` (1 slide).
- **Email Tara** (2026-06) : page Calendrier, texte Histoire à venir, harmoniser « je/nous », autorisation d'élaguer le « bla-bla ».
- **Charte graphique finale** : `1- Charte Graphique/`.

**Critère de réussite global** : un site 6 pages cohérent, aux couleurs **et polices** de la charte, intégrant les retours V1, **validé par Tara page par page** (cf. légende Phase, §8).

---

## 2. Identité de marque (charte officielle)

### Couleurs (PDF charte)
| Token cible | Nom charte | Hex | Rôle |
|---|---|---|---|
| `--mdt-terracotta` | Terracotta | `#79301E` | Accent fort |
| `--mdt-rose` | Vieux rose | `#BA7770` | Accent doux |
| `--mdt-olive` | Vert olive | `#8A976C` | Vert de marque (clair) |
| `--mdt-beige` | Beige | `#F0ECDB` | Fond / base |
| `--mdt-ink` | (neutre texte) | ~`#2C2419` | Texte courant |

> ⚠️ **Écart COULEUR** : le site actuel utilise une palette différente et trop foncée (`--mdt-sauge #4A5D2E`, `--mdt-terracotta #C75B3C`, `--mdt-sable #F4EDE0`). La charte est plus claire / moins orange → répond aux retours #7, #9, #13, #14.

> ⚠️ **Écart POLICES** (à ne pas oublier) : le site actuel charge **Cormorant Garamond / Inter / Caveat**. La charte impose **Playfair Display** (titres) + **La Belle Aurore** (manuscrit). Le swap touche `head.html` + toutes les pages et peut décaler des line-height hérités de Wandau → vérif visuelle des titres requise.

### Typographies cibles
- Titres : `Playfair Display` · Accents manuscrits : `La Belle Aurore`.
- **Corps de texte** : non spécifié par la charte → **4 pairings proposés dans le lab**.

---

## 3. Architecture technique : statique + partials

### Principe
HTML statique (zéro framework lourd), header/footer/nav **mutualisés**. Un assembleur Node `build.mjs` (zéro dépendance) remplace des marqueurs d'include par les partials. **Sortie = HTML pur** → preview statique PowerShell inchangée.

### ⚠️ Contrainte structurelle Locomotive (résolue en Phase 0)
Le template Wandau couple **Locomotive Scroll + jQuery + Swiper** via un wrapper `.smooth-scroll`. **La home migrée place déjà son header MDT *hors* `.smooth-scroll`** (position fixed Locomotive-safe), alors que les **5 pages Wandau brutes gardent l'ancien header *dans* `.smooth-scroll > [data-scroll-section]`**. Un partial `header.html` unique **ne peut pas** s'insérer identiquement dans les deux familles tant qu'on n'a pas **un seul squelette de page canonique**.

→ **Phase 0 doit d'abord figer un squelette canonique** (celui de la home : header hors `.smooth-scroll`, le `.smooth-scroll` ne contenant que le contenu défilant), puis réécrire les 5 pages dans `_src/` sur ce squelette. Les partials sont alors écrits contre **ce seul gabarit**.

### Arborescence cible (`wandau-mdt/`)
```
wandau-mdt/
├─ _partials/   head.html · header.html · footer.html · scripts.html · scripts-min.html
├─ _src/        index · atelier · boutique · calendrier · histoire · contact  (+ marqueurs include)
├─ data/        events.json
├─ css/         tokens.css (NEW) · mdt-override.css (migré) · style.css … (Wandau)
├─ tools/       visit-check vendorisé (cf. §8 prérequis) 
├─ build.mjs    assembleur _src + _partials → *.html
└─ *.html       pages finales GÉNÉRÉES (ne pas éditer à la main)
```

### build.mjs — contrat
- Marqueur dans `_src/*.html` : `<!-- include: header -->` → contenu de `_partials/header.html`.
- **Lit les marqueurs UNIQUEMENT dans `_src/`, écrit dans la racine `wandau-mdt/`, ne relit jamais la racine** (idempotence).
- **Première action Phase 0** : copier l'actuel `index.html` → `_src/index.html`, le découper en partials, et **valider que le HTML régénéré == l'original** AVANT de supprimer l'ancien. L'ordre des opérations est load-bearing.

### scripts partagés — chargement conditionnel
`scripts.html` (Locomotive + scripts.js + preloader) **seulement** sur les pages à `.smooth-scroll`. Les pages dynamiques/autonomes (**calendrier, lab**) reçoivent `scripts-min.html` (drawer seul, **sans preloader ni Locomotive**) — sinon le preloader (`body{overflow:hidden}` jusqu'au chargement de toutes les images) peut laisser une **page blanche** si `locoScroll` est indéfini ou si une image ne déclenche pas son événement.

### tokens.css — migration en un coup (pas de doublon)
`mdt-override.css` définit **déjà** des `--mdt-*` mais avec l'**ancienne palette** et les **mauvaises polices** ; et **seul `index.html` référence `mdt-override.css`** (les 12 autres pages sont 100 % couleurs Wandau). Migration :
1. **Grep de TOUS les usages** `--mdt-sauge/--mdt-sable/--mdt-terracotta…` dans `css/*.css` **et** `*.html`.
2. Renommer vers les noms charte **ou** poser des alias (`--mdt-terracotta: var(--mdt-terra-charte)`) — **un seul jeu de variables**.
3. **Brancher `head.html`** (tokens.css + mdt-override.css + Google Fonts Playfair/La Belle Aurore) sur **les 6 pages**.
4. Réécrire les valeurs `!important` de `body` (lignes 47-48) avec les tokens charte.
5. Critère : **aucune couleur hex Wandau ne subsiste** (grep) sur les 6 pages ; polices charte effectivement chargées.

---

## 4. Le configurateur couleur (lab)

Page **100 % autonome** `lab-couleurs.html` (HTML/CSS/JS pur, **sans scripts.js, sans `.smooth-scroll`, sans preloader**). **4 choix par zone**, rendu réel mis à jour en live (échange de CSS custom properties au clic).

| Zone | Statut | Les 4 options tournent autour de… | Retour lié |
|---|---|---|---|
| **Fond vert** (hero/floral) | primaire | 4 teintes claires d'olive `#8A976C` + opacité wallpaper | #13 (priorité) |
| **Header / topbar** | primaire | beige, beige+filet, olive clair, blanc cassé | #2, #9 |
| **Boutons CTA** | primaire | terracotta, vieux rose, olive, contour | #7, #14 |
| **Couleur des titres** | secondaire | terracotta, olive foncé, ink, vieux rose | — |
| **Police de corps** | secondaire | 4 pairings avec Playfair | — |
| **Pattern floral** | secondaire | 4 opacités/teintes | #13 |

- Zones **secondaires** = ne bloquent pas la validation Tara (choix non explicitement réclamés).
- Encart **« Palette retenue »** : exporte les valeurs de tokens du combo choisi → verrouillage dans `tokens.css`.
- **Hors lab** : les retours #8 (taille logo), #22 (SVG mal centré) et #23 (logo redondant) ne sont pas des choix de palette → **appliqués directement en Phase 2**.
- **Règle durable** : toute future demande couleur passe par un lab à 4 choix ancré charte.

---

## 5. UI/UX par page — réutilisation des templates

Le repo couvre ~90 % des layouts. ⚠️ **Chemins exacts** : les pages réutilisées sont dans `wandau-mdt/` ; les fichiers de *lab/exploration* sont à la **racine du repo**. Le contenu Wandau est **anglais + non localisé** → le vrai travail = **traduction FR + contenu doc Tara + correction coordonnées/carte + branchement formulaire**, pas seulement « repeindre ».

| Page | Base réutilisée (chemin exact) | Blocs réels | À créer / corriger |
|---|---|---|---|
| **Accueil** | `wandau-mdt/index.html` (déjà MDT) — désormais édité dans `_src/index.html` | hero, preloader, nav, footer, newsletter | textes + couleurs + teaser boutique #50 |
| **Contact** | `wandau-mdt/contact.html` | `#contactForm` (4 champs) + iframe Maps + boxes infos | **trad FR**, contenu doc, **bloc accès/transports**, horaires ouverture, FAQ, **carte = mauvaise localisation (cimetière Kiev) à remplacer**, **form poste vers `contact.php` (PHP) → inactif en statique → remplacé par Supabase (cf. §6.4)** |
| **Boutique** | `wandau-mdt/collections.html` + `wandau-mdt/collection-detail.html` | grille **éditoriale** 3 col (cartes sans prix/panier) + fiche détail | adapter déco/textiles, trad FR, couleurs MDT |
| **Histoire** | **contenu/layout MDT = `about-concept-previews.html` (racine)** : 4 variantes **A** Maison de famille · **B** Manifeste premium · **C** Lettre de Tara · **D** Magazine sensoriel. Base structurelle = `wandau-mdt/about.html` (anglais, à repeindre) | 4 mises en page MDT prêtes | poser le texte (en attente de Tara) |
| **Atelier** | `wandau-mdt/visit.html` (accordéon FAQ + liste à icônes horaires) **+ modèle process = `premium-section-lab.html` (racine) `#process`, DÉJÀ en 4 étapes** | FAQ, liste icônes, **4 étapes** | formulaire réservation + remplacer le texte des 4 étapes |
| **Calendrier** | `wandau-mdt/exhibitions.html` (cartes `.exhibition-box` avec dates, réutilisables pour le panneau détail) | cartes événement | ⚠️ **vrai calendrier mensuel à coder** (rien d'existant) |

### Choix « déjà esquissés » à présenter à Tara (esprit lab) — fichiers à la **racine**
- **Header** : 4 variantes dans `premium-section-lab.html`.
- **Histoire** : 4 layouts dans `about-concept-previews.html`.
- **Atelier / process** : `premium-section-lab.html` `#process` (variante A « 4 étapes claires », variante B « Parcours maison »).

> Rapatrier le markup utile de ces fichiers racine dans `wandau-mdt/_src/` en **réécrivant les chemins d'assets** (ne pas linker la preview en place).

> ⚠️ `build.mjs`, `tokens.css`, `data/events.json`, `lab-couleurs.html`, `_partials/` **n'existent pas encore** : ce sont des livrables, pas des blocs « prêts ».

---

## 6. Composants net-new

### 6.1 Calendrier mensuel (`calendrier.html`)
- Données : `data/events.json` (`date`, `titre`, `type`, `description`, `lienReservation?`).
- Rendu : **grille 7 colonnes × 5-6 lignes** (vanilla JS) ; nav mois ± 1 ; **clic date → panneau détail** (style `.exhibition-box`) + bouton réservation si pertinent.
- ⚠️ **Locomotive** : un widget qui re-render au changement de mois dans `.smooth-scroll` aura une hauteur de scroll fausse / éléments mal placés (`locoScroll` est une const locale à l'IIFE de `scripts.js`, inaccessible de l'extérieur). **Décision : la page Calendrier (et la page Atelier/réservation) tournent en scroll natif — pas de `.smooth-scroll`, `scripts-min.html`.** (Option B écartée : exposer `window.locoScroll` + `update()` après chaque render.)
- Pas de backend ; évolutif vers mini-CMS plus tard.

### 6.2 Formulaire de réservation Atelier
- Base : `#contactForm` de `wandau-mdt/contact.html`.
- Champs ajoutés : **date**, **créneau** (créneaux ateliers du doc), **nb participants** (**max 8 → message « appeler / passer à la boutique », cf. #17**).
- Acompte : **6 €/personne** (doc Contact). Backend : **Supabase** (cf. §6.4).

### 6.3 Section « comment ça se passe » (Atelier)
- Base : **variante A « 4 étapes claires » de `premium-section-lab.html` `#process` (déjà 4 étapes)** — il n'y a **rien à étendre**, juste **remplacer le texte** par : **Réserver → Peindre → Confier la pièce → Revenir la retrouver** (retours #38-44, doc Contact). Variante B « Parcours maison » en alternative narrative.

### 6.4 Backend des formulaires — Supabase
Les deux formulaires (Contact §5, Réservation §6.2) postent vers **Supabase** :
- Table `submissions` : `id` · `type` (`contact` | `reservation`) · `payload` (jsonb) · `created_at` (ou 2 tables dédiées).
- Insertion **côté client** via le client JS Supabase (CDN) avec l'**anon key** (publique).
- 🔐 **RLS `insert-only`** : policy autorisant uniquement l'`insert`, **aucune lecture publique** des soumissions. L'URL projet + l'anon key peuvent être publiques **à condition** que la RLS soit active. **Jamais de `service_role` key côté client.**
- Config (URL projet + anon key) dans un petit `js/supabase-config.js`.
- Notification Tara par email : via **trigger / Edge Function** Supabase (optionnel, Phases 3/5).

---

## 7. Contenus & ton

- **Règle de ton (décidé)** : **tout en « je »** (voix de Tara) sur **l'ensemble du site**, y compris les pages pratiques (Atelier, Contact, FAQ, réservation) — les formulations collectives deviennent « je » (« je vous accueille », « je vous recommande »). Harmonise le mélange signalé par Tara.
- **« Bla-bla »** : FAQ + texte Boutique → version resserrée **à côté** de l'originale, Tara tranche.
- **Coordonnées** (source unique, footer + Contact) : `contact@maisondetara.com` · `+33 6 50 53 51 49` · 1 Rue Gabriel Péri, 92250 La Garenne-Colombes · Insta `@maison_de_tara`.
- **Accès / « Venir à la maison »** (page Contact, doc) : **train** (gare La Garenne-Colombes / Paris Saint-Lazare ligne L) · **tram T2** Les Fauvelles · **bus 163, 164, 178, 278** · **voiture** (stationnement + parking public).
- **Horaires** : horaires d'**ouverture de la maison** (par jour) → **page Contact** ; **créneaux d'ateliers** → **formulaire de réservation Atelier** (+ rappel sur Contact). Lève l'ambiguïté du retour #20.
- **FAQ** (doc Contact, ~9 Q/R) : savoir peindre · durée · récupération pièce · âge · réserver · payer (acompte 6 €) · découvrir la boutique · grandes occasions (anniversaire/EVJF/team building/baby shower, **> 8 → Contact/privatisation**) · **« comment savoir ce qui se passe » → page Calendrier + newsletter** (ferme la question #48).

---

## 8. Déroulé par phases (tranches verticales)

**Prérequis outillage (Phase 0)** : `visual-check.mjs` et les annotations vivent **hors repo** (`Interne Propulseo/Pastel Auto-Fix/`). → **vendoriser `visual-check.mjs` + un export figé des annotations dans `wandau-mdt/tools/`**, ou utiliser le **Playwright disponible dans l'environnement** + le serveur statique PowerShell. Captures mobile/tablette/desktop par page.

**Légende Validation** : « toi » = point de contrôle **interne** ; **Tara valide ensuite chaque page** (cf. §1).

| Phase | Livrable | Critère de test | Validation |
|---|---|---|---|
| **0a — Scaffold** | `_partials/` + `build.mjs` + copie home→`_src/`+ découpe ; `tokens.css` valeurs charte **provisoires** ; swap polices dans `head.html` | `node build.mjs` régénère la home **à l'identique** (diff == original) ; polices charte chargées | interne |
| **0b — Squelette + migration** | squelette canonique (header hors `.smooth-scroll`) ; 5 pages Wandau réécrites dans `_src/` ; `head.html` (tokens+override+fonts) branché sur les 6 ; `scripts-min.html` | **aucun hex Wandau résiduel** (grep) ; chaque page build sans page blanche | interne |
| **1 — Lab couleur** | `lab-couleurs.html` (configurateur, zones primaires bloquantes) | 3 zones primaires commutent en live ; encart palette exporte les tokens | **Tara verrouille la palette** |
| **2 — Accueil** | Accueil repeinte (palette figée) + textes Pastel + #8/#22/#23 + **teaser boutique #50** | retours Accueil appliqués ; responsive | toi → **Tara** |
| **3 — Contact** | textes doc + **accès/transports** + horaires ouverture + FAQ + **carte corrigée** + **form → Supabase** | infos/coordonnées/accès exacts ; carte = bonne adresse ; form insère dans Supabase | toi → **Tara** |
| **4 — Boutique** | texte doc (récit « je ») + grille déco | grille + fiche aux couleurs MDT ; FR ; responsive | toi → **Tara** |
| **5 — Atelier** | 4 étapes (`#process`) + réservation (max 8/#17) + privatisation (#45/**#47**) | formulaire + étapes ; responsive | toi → **Tara** |
| **6a — Calendrier (rendu)** | grille mensuelle + `events.json` sur les bonnes dates (scroll natif) | 1 mois correct ; events bien placés | interne |
| **6b — Calendrier (interactions)** | nav mois ± 1 + panneau détail au clic + bouton réservation | navigation + détail OK ; responsive | toi → **Tara** |
| **7 — Histoire** | coquille (1 des 4 layouts), **noindex + hors nav tant que texte absent** | structure prête, pas de lorem publié | bloqué : **texte Tara** |
| **8 — Finitions & prod** | meta/OG par page (var titre dans le build) ; **favicon depuis l'icône tulipe** ; `404.html` ; passe a11y (alt + labels + contraste) ; **optimisation images** héritées | DoD par page validée | toi → **Tara** |

1 commit par phase.

---

## 9. Hors scope / hypothèses / points ouverts

**Hors scope :** blog/journal (`news.html` existe, non vendu), e-commerce panier (Restan en secours), back-office d'édition.

**Hypothèses :** preview = serveur statique local ; déploiement non traité ici (lien domaine à venir de Tara) ; pas d'intégration Pastel Auto-Fix automatisée (pas d'Action GitHub sur ce repo) → retours appliqués en semi-manuel.

**Décisions actées (2026-06-10) :** ton = **tout en « je »** · backend formulaires = **Supabase** (§6.4) · emplacement = **`wandau-mdt/`**.

**Points ouverts (non bloquants) :**
- Pairing police de corps (sortira du lab).
- **#46 anniversaires enfants** : Tara réfléchit (partenariat externe) → différé, **hors livrable Phase 5**.
- **#35** (« ce bouton va où ? ») à clarifier ; **#48** fermé via FAQ→Calendrier.
- **Texte page Histoire** : en attente de Tara (bloquant nommé Phase 7).

---

## 10. Annexe — Mapping des 49 retours Pastel (#2 → #50) → page / phase

> 49 retours actifs, **numérotés #2→#50** (pas de #1 ; #50 inclus). Tous posés aujourd'hui sur la page d'accueil ; certains migrent vers les nouvelles pages.

- **Accueil (Phase 2)**
  - Couleurs *via lab* : #2, #7, #9, #13, #14.
  - Couleurs *appliquées directement* (hors lab) : #8 (taille logo), #22 (SVG centrage), #23 (logo redondant).
  - Textes / teasers : #18, #19, #21, #24, #25, #26, #29, #30, #31, #33.
  - Structure : #3, #4, #28, #32, #34 · hero photos : #15 · box résa → bouton : #16.
  - **#50** — teaser boutique « Passer à la maison – découvrir la boutique déco » (texte fourni par Tara, prêt) inséré entre l'atelier et les rendez-vous.
- **Atelier (Phase 5)** — #17 (max 8 → appeler/boutique) · #38-#44 (les 4 étapes) · #45 (privatisation : réduire tailles images + photo « other group events ») · **#47** (sous-titre privatisation « Privatisez la maison pour créer de beaux souvenirs »).
- **Contact (Phase 3)** — #10, #11, #12 (coordonnées) · **#20** (horaires d'ouverture maison) · FAQ + accès/transports (doc).
- **Calendrier (Phase 6)** — alimenté par la FAQ « comment savoir ce qui se passe » ; #48 fermé (FAQ→Calendrier).
- **Newsletter / footer (Phase 2)** — #49.
- **Histoire (Phase 7)** — #5, #6, #36, #37 (déplacements de la partie histoire).
- **Questions à clarifier / différés** — #27 (photos plus tard, note) · #35 (bouton ?) · **#46** (anniv enfants, différé — **pas un livrable Phase 5**).
