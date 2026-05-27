# 🏺 MAISON DE TARA — Brief Master Claude

> **Usage** : Ce document est le **brief complet** à fournir à Claude (Claude Code, Claude.ai, ou autre) pour qu'il reprenne le projet Maison de Tara en pleine connaissance de cause et l'améliore. Tout le contexte stratégique, brand, technique et créatif est ici.

---

# 📌 PARTIE 1 — TON RÔLE & TA MISSION

## Ton rôle

Tu es un **Lead Designer & Frontend Engineer** intervenant pour **Propul'SEO**, agence digitale française spécialisée dans les sites haut de gamme pour PME. Tu portes 3 casquettes simultanément :

1. **Brand guardian** : tu garantis que chaque pixel reflète l'ADN de Maison de Tara — *"luxe silencieux, on ne presse pas, métissage Inde × France, élégance non démonstrative"*. Tu refuses les choix qui trahissent cette ADN.

2. **Marketing strategist** : chaque section sert un KPI mesurable (réservation, newsletter, awareness). Si une section n'a pas de KPI clair, elle dégage.

3. **Frontend engineer** : tu produis du code propre, performant, accessible et fidèle à la maquette de référence.

## Ta mission

**Améliorer la maquette HTML actuelle de la landing page Maison de Tara** (fournie dans le repo : `maison-de-tara-mockup.html`).

L'objectif n'est PAS de partir de zéro mais de :
- **Affiner** ce qui est déjà bien (palette, structure, copy)
- **Corriger** ce qui peut l'être (responsive, micro-interactions, accessibilité)
- **Enrichir** avec ce qui manque (animations subtiles, gestion d'états, edge cases)
- **Préparer le terrain** pour la migration vers la stack V3 Propul'SEO (TanStack Start + Tailwind v4 + Supabase + Sanity/Payload)

Cette maquette sera montrée à la cliente (Tara) pour validation de la direction artistique. Elle doit être **impeccable** visuellement avant que je l'utilise comme référence pour le scaffolding V3.

---

# 📌 PARTIE 2 — CONTEXTE CLIENT

## La cliente

**Tara Abidi Badelon** (abidi.tara@gmail.com)
- Fondatrice de Maison de Tara
- Origine indienne, vit en France
- Sensibilité brand-first, refuse les codes "café commerce standardisé"

## Le projet

**Maison de Tara** : lieu hybride à La Garenne-Colombes (92), combinant 3 univers :

1. **Atelier de peinture sur céramique** — activité principale, sessions de 2h en autonomie
2. **Café** — boissons (avec & sans alcool), pâtisseries, charcuterie artisanale, ouvert sans réservation
3. **Boutique de décoration d'inspiration indienne** — textiles, lampes, objets, sélection saisonnière

**Concept commercial validé** : *"Un lieu hybride combinant atelier, café et boutique. Un lieu où l'on prend le temps."*

## Planning

| Date | Étape |
|---|---|
| Avril 2026 | Premier RDV commercial Propul'SEO |
| Mai 2026 | Contrat signé, acompte 50% (990€) payé sur formule Essentielle (1980€) |
| Mai 2026 | Brief créatif + mood board reçus |
| **Mai 2026** | **Maquette HTML V0 (état actuel)** |
| Été 2026 | Développement V3 stack Propul'SEO |
| Septembre 2026 | Mise en ligne site officiel |
| Octobre 2026 | Ouverture physique du lieu |

## Cibles (par ordre de priorité)

1. **Femmes 25-65 ans** — boutique & ateliers (cœur de cible)
2. Étudiants / jeunes travailleurs / groupes (anniversaires, EVJF)
3. Jeunes familles (kids friendly + kids club futur)
4. Couples (activité "date")
5. Team building & after-work entreprises
6. Jeunes retraités (book reading, communautés)

**Zone géographique** : Hauts-de-Seine (92) — La Garenne-Colombes, Colombes, Bois-Colombes, Courbevoie, Boulogne-Billancourt, Neuilly, Levallois, Puteaux, Ouest parisien.

---

# 📌 PARTIE 3 — ADN DE MARQUE (NON NÉGOCIABLE)

## Si Maison de Tara était une personne

Une femme métissée Inde × France, qui a grandi entre deux cultures :
- D'un côté : tissus, motifs indiens, gestes artisanaux, fait main, temps long
- De l'autre : goût du détail français, simplicité élégante, sens de l'espace

Elle accueille naturellement, sans en faire trop. On se sent bien immédiatement.

## Personnalité de la marque

- **Féminine** sans tomber dans le cliché
- **Chaleureuse** — accueille sans en faire trop
- **Élégante** — ne cherche pas à impressionner
- **Dans la nuance**

## Ce qu'elle EST

- Une **maison vivante** — communautaire
- Un lieu de **luxe silencieux**
- Un endroit où **le temps ralentit**
- Une expérience où **on ne presse pas, on ne cherche pas la perfection**

## Ce qu'elle N'EST PAS (anti-références strictes)

- ❌ Concept store moderne / industriel
- ❌ Coffee shop standardisé
- ❌ Atelier enfantin / coloré
- ❌ Café bruyant / hipster
- ❌ Site e-commerce "Add to Cart"
- ❌ Promotion agressive ("Save 55%", "Today Only", urgence)

## Les 3 piliers (à utiliser comme baseline / tagline)

> **Créer** — Peindre la céramique, librement
> **Partager** — Prendre un café, un verre, rester
> **Prolonger** — Emporter un objet, chez soi

## Promesse expérientielle clé

> *« On ne vous apprend pas à peindre. On vous laisse essayer. »*

---

# 📌 PARTIE 4 — DESIGN SYSTEM OFFICIEL

## Palette de couleurs (validée par mood board)

```css
:root {
  /* Base — 60% du visuel */
  --mdt-sable:      #F4EDE0;  /* background principal */
  --mdt-sable-warm: #E8DCC4;  /* alternance sections */
  --mdt-sable-deep: #DCC9A5;  /* tons placeholder */
  --mdt-greige:     #B5A998;  /* neutre chaud */

  /* Primary — 25% */
  --mdt-terracotta: #C75B3C;  /* CTA principal, accent fort */
  --mdt-terra-dark: #8B4A2E;  /* hover terracotta */

  /* Accent — 16% */
  --mdt-sauge:      #4A5D2E;  /* hero, navigation, titres section */
  --mdt-sauge-light:#7A8043;  /* variations */
  --mdt-olive-deep: #3a4a24;  /* fonds profonds */

  /* Highlight — 5% */
  --mdt-noir:       #1A1815;  /* texte titre */
  --mdt-noir-soft:  #2C2419;  /* fond newsletter */
  --mdt-laiton:     #B8924D;  /* accent éditorial, italiques chics */

  /* Sémantique */
  --mdt-text:       #2C2419;
  --mdt-text-soft:  #5F4F3F;
  --mdt-line:       rgba(74,93,46,0.18);
}
```

## Typographies

| Usage | Police | Source |
|---|---|---|
| **Display (titres)** | Cormorant Garamond | Google Fonts |
| **Body** | Inter | Google Fonts |
| **Script (signature Tara)** | Caveat | Google Fonts |

Règles :
- **Cormorant Garamond italique** sur les mots-clés émotionnels (ex: *"de la Maison"*, *"prend le temps"*)
- **Inter en uppercase + letter-spacing 0.18em** pour eyebrows, nav, CTA, étiquettes
- **Pas de bold lourd** — uniquement 300 / 400 / 500 maximum
- **Pas de Title Case** — sentence case ou ALL CAPS uniquement

## Motifs visuels

- **Tulipes block print** SVG inline (motif signature, depuis le mood board)
- **Feuilles botaniques** en filigrane sur fonds clairs
- **Block print indien** en pattern subtil (opacity 4-8%) sur sections clés (Hero, Newsletter, Events)
- **Pas de gradients, pas d'ombres lourdes** — flat editorial uniquement
- **Double-bordure laiton** (frame décalée) sur cards importantes (booking, photo "Bienvenue")

## Espacements

```css
--section-pad: clamp(64px, 8vw, 120px);  /* padding vertical sections */
--container:   1280px;                   /* largeur max contenu */
```

## Boutons

- **Primary** : fond terracotta `#C75B3C`, texte sable, hover terracotta sombre `#8B4A2E`
- **Outline** : transparent, bordure sauge `#4A5D2E`, texte sauge, hover inversion
- **Outline light** : transparent, bordure sable, texte sable (sur fond sombre)
- **Link** : sans bouton, soulignement épais 1px sauge

Tous les boutons :
- Padding `16px 32px`
- Font Inter 12px, letter-spacing `0.18em`, UPPERCASE
- Transition 300ms cubic-bezier

---

# 📌 PARTIE 5 — ARCHITECTURE DE LA LANDING PAGE

La maquette comporte **11 sections** dans cet ordre précis (non négociable sans validation) :

| # | Section | Objectif | KPI servi |
|---|---|---|---|
| 1 | Top bar | Contact + ouverture annoncée | Confiance |
| 2 | Header | Logo + nav + CTA résa | Navigation |
| 3 | **Hero** | Slider 3 univers + module booking | Compréhension <10s + Conversion |
| 4 | Bienvenue Tara | Storytelling Inde × France + signature | Émotion + scroll |
| 5 | Les 3 univers | Cards détaillées Atelier/Café/Boutique | Compréhension détaillée |
| 6 | Comment ça marche | 4 étapes du parcours client | Réassurance |
| 7 | **Calendrier** | 3 prochains événements | Conversion résa |
| 8 | Horaires + adresse | Liste + bloc téléphone | Conversion physique |
| 9 | Galerie | 5 vignettes asymétriques | Désir |
| 10 | Le Journal | 2 articles blog | SEO + engagement |
| 11 | Newsletter | Encart conversion sticky | KPI inscription |
| 12 | Footer | 3 colonnes + bottom | Crédibilité |

## Logique narrative

```
Hero (QUOI ?) → Bienvenue (POURQUOI ?) → 3 univers (COMMENT ?)
→ Comment ça marche (COMMENT EN PRATIQUE ?) → Calendrier (QUAND ?)
→ Horaires/Adresse (OÙ ?) → Galerie (À QUOI ÇA RESSEMBLE ?)
→ Journal (QUELLE HISTOIRE ?) → Newsletter (RESTER PROCHE ?)
→ Footer (RÉCAP)
```

---

# 📌 PARTIE 6 — KPIs LANDING PAGE

| KPI | Cible | Section principale responsable |
|---|---|---|
| **Compréhension du concept < 10s** | 100% des visiteurs | Hero (tabs visibles immédiatement) |
| **Taux de clic CTA "Réserver un moment"** | > 8% | Hero booking + cards univers + Calendrier |
| **Scroll jusqu'à section 5 (storytelling)** | > 40% | Hero attractif + transition naturelle |
| **Inscription newsletter** | > 3% | Section dédiée S11 |
| **Click téléphone (réservation)** | > 2% | Section Horaires S8 + Footer |

**Tout choix de design doit servir au moins UN de ces KPIs.** Si une décoration / animation / section ne sert aucun KPI, elle doit être justifiée par l'ADN brand ou supprimée.

---

# 📌 PARTIE 7 — DÉCISIONS DÉJÀ ACTÉES (NE PAS REMETTRE EN QUESTION)

Ces points ont été tranchés en accord avec Tara et l'équipe Propul'SEO. Ne pas les changer sans validation explicite.

1. ✅ **Direction visuelle = Variante B (block print éditorial)** — pas de hero photo plein écran, pas de minimalisme typo pur
2. ✅ **CTA principal = "Réserver un moment"** — pas "Réserver" ni "Réserver une session"
3. ✅ **Aucun prix affiché** sur la landing (ateliers, café, objets)
4. ✅ **Pas d'e-commerce phase 1** — la boutique est uniquement vitrine
5. ✅ **Storytelling intégré à la landing**, pas de page À propos séparée (V1)
6. ✅ **FR uniquement** au lancement
7. ✅ **Pas de page Équipe / Chefs** — Tara est seule au début
8. ✅ **Pas de témoignages / avis clients** — pas de clients au lancement
9. ✅ **Pas de stats type "12K clients"** — anti-ADN "luxe silencieux"
10. ✅ **Module booking visible dans le hero** — pas de page résa séparée

---

# 📌 PARTIE 8 — COPY OFFICIEL (à utiliser tel quel)

## Hero

**Eyebrow** : `La Garenne-Colombes · Ouverture Automne 2026`

**Accroche H1 (tab Atelier - défaut)** : *"La maison où l'on prend le temps."*
**Accroche H1 (tab Café)** : *"S'attabler. Sans réserver."*
**Accroche H1 (tab Boutique)** : *"Une boutique aux pièces choisies."*

**Sous-titre H1** : *"Un lieu hybride entre atelier de peinture sur céramique, café et maison de décoration d'inspiration indienne — pensé comme une maison vivante."*

**CTA primary** : `Réserver un moment`
**CTA secondary** : `Découvrir le lieu`

## Bienvenue Tara

**Eyebrow** : `Bienvenue`
**H2** : *"Une maison née entre deux cultures, deux rythmes."*
**Texte** :
> *Maison de Tara est née d'un équilibre entre la France et l'Inde. Une maison familiale, communautaire, où l'on prend le temps de créer, partager et se retrouver.*
>
> *Entre tradition artisanale et élégance contemporaine, un lieu où la matière, les gestes et les objets ont du sens. Un lieu que l'on habite, le temps d'un moment.*
>
> *« On ne vous apprend pas à peindre. On vous laisse essayer. »*

**Signature** : `Tara` — `Fondatrice`

## Les 3 univers

**Eyebrow** : `Trois univers, un seul lieu`
**H2** : *"Créer. Partager. Prolonger."*
**Sous-titre** : *"Chaque pièce de la Maison vit selon son propre rythme — mais ensemble, elles racontent une seule histoire."*

### Card Atelier
- **Titre** : `L'Atelier`
- **Description** : *"Choisissez une pièce en céramique, installez-vous, peignez librement. Repartez avec votre création une semaine plus tard, cuite à 1000°C."*
- **Features** :
  - Sessions de 2 heures en autonomie
  - Café, thé et inspirations à disposition
  - Bons cadeaux et workshops thématiques
- **CTA** : `Réserver une session`

### Card Café
- **Titre** : `Le Café`
- **Description** : *"Un espace pour s'attabler sans réserver. Café spécialité, thés rares, pâtisseries du jour et charcuterie — pensés comme à la maison."*
- **Features** :
  - Ouvert sans réservation
  - Carte saisonnière, produits artisans locaux
  - Boissons avec et sans alcool
- **CTA** : `Voir l'esprit du café`

### Card Boutique
- **Titre** : `La Boutique`
- **Description** : *"Une sélection de pièces de décoration d'inspiration indienne — nappes brodées, lampes en céramique, textiles en block print, objets choisis."*
- **Features** :
  - Pièces renouvelées chaque saison
  - Sélection artisanale et confidentielle
  - Nouveautés présentées sur place
- **CTA** : `Découvrir la boutique`

## Comment ça marche

**Eyebrow** : `Le parcours`
**H2** : *"Comment ça se passe ?"*
**Sous-titre** : *"Quatre étapes simples, depuis votre arrivée jusqu'au retour chez vous avec votre pièce."*

| # | Titre | Description |
|---|---|---|
| 01 | **Choisir** | *Parcourez les pièces — tasses, bols, assiettes, vases — et choisissez celle que vous voulez peindre.* |
| 02 | **S'installer** | *Prenez place à une table, un café à la main. Les pinceaux, palettes et inspirations vous attendent.* |
| 03 | **Peindre** | *2 heures pour laisser couler les idées. Sans pression, sans recherche de perfection.* |
| 04 | **Repartir** | *Votre pièce part en cuisson à 1000°C. Vous la récupérez 7 jours plus tard, prête à habiter votre maison.* |

## Calendrier

**Eyebrow** : `À venir`
**H2** : *"Les rendez-vous de la Maison"*
**Sous-titre** : *"Workshops, soirées, collaborations avec artistes et artisans — la Maison vit au rythme des saisons."*

**Cards d'exemple** :
- 15 Nov · Workshop · Avec Anaïs Fleurs — *Atelier fleurs séchées et céramique* — Samedi · 14h00 – 17h00
- 28 Nov · Soirée · Vins nature & céramique — *Apéro créatif du vendredi soir* — Vendredi · 19h00 – 22h00
- 06 Déc · Kids · Spécial Noël — *Workshop enfants — décorations de Noël* — Samedi · 10h00 – 12h00

**CTA footer** : `Voir tout le calendrier`

## Horaires + Adresse

**Eyebrow** : `Le lieu`
**H2** : *"Nous rendre visite"*
**Sous-titre** : *"Au cœur de La Garenne-Colombes, dans une boutique vert sauge — vous reconnaîtrez la Maison à sa façade."*

**Horaires** :
- Lundi : *Fermé*
- Mardi — Vendredi : 10h00 – 19h00
- Samedi : 10h00 – 20h00
- Dimanche : 11h00 – 18h00

**Bloc contact** :
- Eyebrow : `Nous appeler`
- Téléphone : `01 47 XX XX XX` *(à remplacer par le vrai)*
- Adresse : *Adresse à confirmer · La Garenne-Colombes, 92250*

## Galerie

**Eyebrow** : `La vie du lieu`
**H2** : *"Quelques instants"*
**Sous-titre** : *"Sorties de four, ateliers, détails de la Maison — l'esprit du lieu en images."*

**Tags vignettes** : `Atelier · L'atelier en action` / `Rituel · Sortie de four` / `Café · Apéro maison` / `Boutique · Détails du lieu` / `Workshops · Moments partagés`

## Journal

**Eyebrow** : `Le Journal`
**H2** : *"Coulisses & inspirations"*
**Sous-titre** : *"Les histoires qui se tissent autour de la Maison — rituels, rencontres, recettes."*

## Newsletter

**Eyebrow** : `Rester proche`
**H2** : *"Recevoir des nouvelles de la Maison"*
**Sous-titre** : *"Les prochaines dates, les rituels saisonniers, les nouvelles pièces — une lettre par mois, jamais plus."*

**Placeholder input** : `Votre adresse email`
**CTA** : `S'abonner`

## Footer

**Tagline About** : *"Atelier de peinture sur céramique, café et maison de décoration d'inspiration indienne, au cœur de La Garenne-Colombes. Un lieu où l'on prend le temps."*

---

# 📌 PARTIE 9 — ÉTAT DE L'ART ACTUEL (CE QUI EXISTE)

## Fichiers fournis dans le repo

1. **`maison-de-tara-mockup.html`** — la maquette HTML/CSS/JS actuelle (1646 lignes, ~52 Ko)
2. **Templates Restan v1.3** — 6 versions de homepage achetées chez ValidThemes, dossier `Restan v1.3/source/` (servent de référence structurelle uniquement, pas stylistique)

## Ce qui FONCTIONNE déjà bien dans la maquette actuelle

✅ Palette de couleurs fidèle au mood board
✅ Typo Cormorant + Inter + Caveat bien intégrées
✅ Structure 11 sections respecte la logique narrative
✅ Hero : slider tabs Atelier/Café/Boutique + module booking en colonne droite
✅ Signature manuscrite Tara en cursive terracotta
✅ Module booking avec double-bordure laiton décalée (effet éditorial fort)
✅ Section événements avec date en encart terracotta sur fond sauge
✅ Galerie asymétrique 1 grande + 4 petites
✅ Footer 3 colonnes + bottom bar
✅ Responsive desktop / tablet / mobile basique
✅ Fade-in au scroll
✅ Switch dynamique du H1 selon le tab cliqué

## Ce qui PEUT être AMÉLIORÉ (mission)

### 🎨 Amélioration visuelle

1. **Motifs block print plus présents** : actuellement à 4-8% opacité, peuvent être renforcés ponctuellement (Hero notamment) sans devenir agressifs
2. **Animations d'entrée plus orchestrées** : actuellement simple fade-in, pourrait avoir un stagger plus chic à la Murmure Concept Store
3. **Hover states** sur les cards univers : actuellement juste translateY, ajouter une révélation progressive du contenu
4. **Logo typographique** : actuellement texte pur, intégrer un picto SVG tulipe avant/après "MAISON de TARA" pour matcher le mockup devanture
5. **Placeholders images** : actuellement gradient gris, créer des illustrations SVG plus chic (silhouettes tulipes/feuilles/céramique stylisées)
6. **Transitions entre sections** : ajouter des séparateurs visuels subtils (motifs floraux ou ondulations)

### 📱 Amélioration responsive

1. **Mobile menu** : actuellement la nav disparaît complètement en <900px. Ajouter un burger menu fonctionnel
2. **Hero mobile** : le module booking passe en dessous mais sa taille n'est pas optimale en mobile
3. **Galerie mobile** : l'asymétrie casse, retravailler le grid mobile
4. **Touch targets** : vérifier que tous les boutons font au minimum 44×44px en mobile

### ♿ Accessibilité

1. **Contraste** : vérifier WCAG AA partout (notamment terracotta sur sable warm)
2. **Focus states** : ajouter des outlines visibles sur tous les éléments interactifs (sauge ou terracotta)
3. **Aria labels** : compléter sur les icônes sociales footer, les SVG décoratifs (aria-hidden), les boutons icon-only
4. **Skip link** : ajouter un "Aller au contenu" en début de page pour navigation clavier
5. **Heading hierarchy** : vérifier qu'il n'y a qu'un seul H1 et que la hiérarchie est cohérente
6. **prefers-reduced-motion** : désactiver les animations pour les utilisateurs concernés

### ⚡ Performance

1. **Fonts** : précharger uniquement les weights utilisés (300, 400, 500 + italiques)
2. **SVG inline** : factoriser les patterns répétés (block print) en `<defs>` réutilisables
3. **Critical CSS** : extraire le CSS above-the-fold
4. **Lazy loading** : préparer pour les vraies images (loading="lazy" et fetchpriority)

### 🎭 Micro-interactions à ajouter

1. **Booking form** : feedback visuel sur sélection (transition select, highlight focus)
2. **Boutons** : effet de ripple ou shimmer subtil au hover
3. **Cards univers** : icône qui se "réveille" au hover (rotation/scale subtle)
4. **Section calendrier** : effet "papier à plier" léger sur les cards événements
5. **Newsletter** : animation de succès/erreur sur submit (même si simulée)

### 🔧 Code quality

1. **Variables CSS** : déjà bien structurées, mais ajouter des aliases sémantiques (`--color-cta-primary` qui pointe sur `--mdt-terracotta`)
2. **Composants réutilisables** : identifier les patterns (card, button, eyebrow) et les nommer en classes BEM ou utility
3. **JS** : actuellement monolithique, structurer en modules (hero-tabs, scroll-observer, mobile-menu)
4. **HTML semantic** : vérifier les balises `<article>`, `<section>`, `<nav>`, `<aside>` partout

---

# 📌 PARTIE 10 — MISSION SPÉCIFIQUE

## Ce que je veux que tu produises

**Une V1 améliorée de `maison-de-tara-mockup.html`** qui :

1. **Garde** : structure des 11 sections, palette, typo, copy, logique narrative
2. **Améliore** : tous les points listés dans la section 9 "Ce qui peut être amélioré"
3. **Ajoute** : ce que tu juges manquant pour atteindre le niveau "production-ready prototype"
4. **Documente** : un changelog en commentaire en début de fichier listant les changements vs la V0

## Contraintes techniques

- ❌ **PAS de framework** (pas de React, pas de Vue) — HTML/CSS/JS vanilla
- ❌ **PAS de bundler** — fichier autonome `.html` que je peux double-cliquer
- ❌ **PAS de dépendances NPM** — seules les Google Fonts sont autorisées
- ✅ **Tailwind via CDN** autorisé SI ça améliore vraiment le code (pas obligatoire)
- ✅ **Alpine.js via CDN** autorisé pour micro-interactions (pas obligatoire)
- ✅ Garder le format **single HTML file** ou maximum 3 fichiers (html + css + js séparés)

## Critères d'acceptation

La V1 sera validée si :

- [ ] **Visuel** : Tara dirait *"oui, c'est exactement mon univers"* en voyant la maquette
- [ ] **Conversion** : un visiteur peut réserver en moins de 30 secondes depuis le hero
- [ ] **Compréhension** : un visiteur comprend ce qu'est MdT en lisant uniquement le hero (test 5s)
- [ ] **Responsive** : impeccable sur iPhone SE (375px), iPad (768px), desktop 1440px, 4K (2560px)
- [ ] **Performance** : Lighthouse > 90 sur tous les critères (mobile)
- [ ] **Accessibilité** : Lighthouse a11y > 95, navigation clavier complète
- [ ] **Code** : lisible, commenté, prêt à être migré en React/TanStack par un dev qui ne connaît pas le projet
- [ ] **Brand** : aucun élément qui trahit l'ADN ("luxe silencieux", "on ne presse pas")

## Anti-patterns absolus

Si tu fais ces choses, c'est mauvais :

- ❌ Ajouter des étoiles / notes / avis clients
- ❌ Afficher des prix
- ❌ Mentionner des promos / urgence / FOMO
- ❌ Utiliser du purple / bleu / autre couleur hors palette
- ❌ Ajouter des stats type "+1000 clients satisfaits"
- ❌ Mettre Tara en photo de couverture (elle veut rester discrète)
- ❌ Utiliser des emojis dans le contenu visible (✅ OK dans les commentaires code)
- ❌ Ajouter du jQuery
- ❌ Mettre des animations qui prennent + 800ms par élément
- ❌ Ajouter une cookie banner intrusive (V2 si nécessaire)
- ❌ Renommer ou réorganiser les sections sans validation
- ❌ Modifier le copy fourni (sauf bugs de typo évidents)

---

# 📌 PARTIE 11 — APRÈS LA V1 (CONTEXTE FUTUR)

Une fois cette V1 validée par Tara, le projet entrera en **phase 2 : reconstruction en stack V3 Propul'SEO**.

## Stack V3 cible

- **Frontend** : TanStack Start + React + Tailwind v4
- **Backend** : Supabase (Postgres + Auth + Realtime)
- **CMS** : Sanity ou Payload (à arbitrer) — pour que Tara puisse éditer ses textes, événements, photos, articles blog
- **Email** : Brevo (newsletter + confirmations résa)
- **Paiement** : Stripe (acompte 6€ no-show + bons cadeaux)
- **Hébergement** : Coolify self-hosted

## Ce que la V1 doit anticiper

- **Design tokens** clairs et exportables vers Tailwind v4 (`tailwind.config.js`)
- **Composants identifiables** facilement (Button, Card, Section, Hero) → faciliter le passage en React composants
- **Schemas de données implicites** : structure d'un "événement", d'un "article blog", d'une "réservation" — qu'on pourra mapper sur Sanity/Supabase
- **States documentés** : loading, error, success, empty — partout où ça compte
- **Routes implicites** : les liens `#atelier`, `#calendrier` etc. doivent correspondre aux futures routes Next/TanStack

---

# 📌 PARTIE 12 — RÉFÉRENCES & INSPIRATIONS

## Validées par Tara

- **Murmure Concept Store** (https://murmure-wine.vercel.app/) — référence structure validée
- **Comptoir Ceramica Antibes** (@comptoir_ceramica) — palette terracotta/sable proche
- **La Potinerie Saint-Malo** (@cafelapotinerie) — bio Insta minimale efficace
- **Ça Papote Lorient** (@capapote_) — positionnement hybride identique

## Rejetées par Tara

- **Talkarty.com** — *"too much, trop d'infos, je suis perdu"*
- **Sites café céramique colorés/cartoon** (Bleu Biscuit, Biscuit Atelier) — trop "fun enfants"

## Codes esthétiques à puiser

- **Hôtels boutiques parisiens** (Hoxton, Le Pigalle, Mama Shelter quand sobre)
- **Marques de céramique haut de gamme** (Astier de Villatte, Jars Céramistes)
- **Magazines lifestyle français** (Apartamento, Cabana magazine, Holiday Magazine)
- **Block print textile indien** (Anokhi, Good Earth India, Soma Block Prints)

---

# 📌 PARTIE 13 — CHECKPOINTS DE LIVRAISON

Avant de me livrer ta V1 améliorée, vérifie :

## ✅ Checklist Brand

- [ ] Aucun élément ne trahit l'ADN "luxe silencieux"
- [ ] Le motif tulipe block print apparaît au moins 3× sur la page
- [ ] La signature manuscrite "Tara" est présente et lisible
- [ ] Les 3 piliers "Créer · Partager · Prolonger" apparaissent au moins 1×
- [ ] Aucune référence visuelle à un "fast food" / "restaurant" / "shop"

## ✅ Checklist Tech

- [ ] Fichier unique HTML autonome (ou max 3 fichiers)
- [ ] Aucune dépendance bloquante (offline-friendly hors Google Fonts)
- [ ] Validation HTML5 (W3C validator)
- [ ] CSS sans erreur
- [ ] JS sans erreur console
- [ ] Lighthouse Mobile > 90 partout

## ✅ Checklist UX

- [ ] Navigation clavier complète (Tab order logique)
- [ ] Focus states visibles
- [ ] Touch targets >= 44×44px en mobile
- [ ] Texte lisible (contraste WCAG AA)
- [ ] Pas de scroll horizontal en mobile
- [ ] Toutes les images ont un `alt` ou `aria-hidden`

## ✅ Checklist Livraison

- [ ] Changelog en début de fichier listant tes améliorations
- [ ] Comments dans le code sur les choix non évidents
- [ ] Section "TODO" en commentaire à la fin pour ce que tu n'as pas pu faire

---

# 📌 PARTIE 14 — DEMANDE FINALE

À partir de tout ce contexte :

> **Analyse la maquette actuelle `maison-de-tara-mockup.html`, comprends ce qui est bien et ce qui peut être amélioré (en lien avec la section 9 et les critères d'acceptation section 10), puis produis-moi une V1 améliorée du fichier HTML.**
>
> **Commence par me lister, dans ta réponse, les 10 améliorations prioritaires que tu vas implémenter (par ordre d'impact business/brand). Demande-moi de valider ces 10 améliorations AVANT d'écrire le code.**
>
> **Une fois validé, livre-moi le HTML complet avec changelog en en-tête, code commenté, et une note de fin sur ce qui reste à faire en V2.**

---

*Document préparé par Propul'SEO · 27 mai 2026*
*Cliente : Maison de Tara · Lancement site : septembre 2026 · Lancement lieu : octobre 2026*
