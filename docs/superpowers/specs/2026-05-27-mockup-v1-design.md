# Mockup V1 — Spécification

**Date :** 2026-05-27
**Projet :** Maison de Tara — amélioration mockup HTML pour validation cliente (Tara)
**Statut :** Top 10 priorités validé, prêt pour implémentation
**Brief de référence :** [PROMPT-MASTER-MDT.md](../../../PROMPT-MASTER-MDT.md)

## Mission

Améliorer `maison-de-tara-mockup.html` (V0 actuelle, 1654 lignes) en une **V1 production-ready prototype** que Tara validera avant la reconstruction en stack V3 (été 2026).

## Contraintes (du brief)

- HTML/CSS/JS **vanilla** (pas de framework, pas de bundler, pas de NPM)
- Google Fonts uniquement
- Garder la structure des **11 sections** et le copy fourni
- Respect strict de l'ADN brand "luxe silencieux"
- Anticiper la migration React/TanStack en phase 2

## Décisions

- **Ambition** : niveau "ambitieux" (~10-12h) — on repense des mécaniques, pas juste de la correction
- **Format** : 3 fichiers séparés (`index.html` + `styles.css` + `scripts.js`)
- **Compatibilité offline** : conservée (les 3 fichiers fonctionnent en local sans serveur)

## Top 10 priorités (par ordre d'impact)

### 🔴 Critiques

**1. Mobile menu burger fonctionnel**
La nav et le CTA principal disparaissent en <900px dans la V0. Drawer latéral overlay avec animation d'ouverture/fermeture. Touch targets ≥44×44px.
*KPI : Click CTA Réserver >8% + Click téléphone >2%*

**2. Suppression des emojis du contenu visible**
Le brief interdit explicitement les emojis dans le rendu visible. Remplacement par SVG line-art minimalistes (téléphone, pin localisation, enveloppe, horloge) en sauge/laiton.
*ADN : "luxe silencieux"*

**3. Logo avec picto tulipe SVG**
Intégration d'un picto tulipe block-print stylisé avant le texte "MAISON de TARA", proportionné, pour cohérence avec la devanture mentionnée dans le brief.

### 🟠 Fort impact

**4. Tabs hero ambitieux**
Changement complet d'univers visuel selon le tab sélectionné :
- **Atelier** : fond sauge (actuel), booking = formulaire réservation session
- **Café** : fond sauge-deep teinté terracotta, booking devient bloc "Voir la carte, pas de résa"
- **Boutique** : fond sauge + accents laiton renforcés, booking devient bloc "Nous rendre visite" (horaires + adresse)

Transition 600ms cubic-bezier entre les 3 mondes (couleurs + contenu booking).
*KPI : Compréhension du concept <10s*

**5. Animations d'entrée orchestrées en stagger**
Stagger 80-120ms entre les éléments d'une section (à la Murmure Concept Store). Respect strict de `prefers-reduced-motion` (désactivation complète).
*ADN : perception "luxe silencieux"*

**6. Placeholders gradients gris → illustrations SVG éditoriales**
Welcome image, location, gallery items, events, journal → illustrations SVG line-art : silhouettes céramique, tulipes stylisées, feuilles botaniques, motifs block print. Tara verra ces visuels avant ses photos réelles.

**7. Micro-interactions ciblées**
- Cards univers : icône qui s'anime au hover (rotation subtle 8°) + révélation progressive des features
- Booking form : highlight focus + feedback de sélection (transition border-color sauge → terracotta)
- Newsletter : message de succès simulé après submit
- Event cards : effet "papier" léger (transform + shadow subtle)

*KPI : Click CTA >8%, Inscription newsletter >3%*

### 🟢 Qualité indispensable

**8. Accessibilité Lighthouse >95**
- Focus states visibles partout (outline sauge ou terracotta selon contexte)
- Skip link "Aller au contenu" en début de page
- `prefers-reduced-motion` désactive toutes les animations
- `aria-hidden` sur SVG décoratifs, `aria-label` sur boutons icon-only
- Balise `<main>` + sémantique HTML revue
- Hiérarchie heading (un seul H1, hiérarchie cohérente)
- Touch targets ≥44×44px en mobile
- Contraste WCAG AA vérifié sur toutes les combinaisons

**9. Refactoring en 3 fichiers + composants identifiables (Phase 2 ready)**

Structure :
```
maison-de-tara/
├── index.html       # markup uniquement
├── styles.css       # tokens + composants + sections
└── scripts.js       # modules JS (mobile-menu, hero-tabs, scroll-observer)
```

Conventions :
- Classes BEM-like : `.btn`, `.btn--primary`, `.card`, `.card--universe`
- Variables CSS sémantiques en plus des tokens : `--color-cta-primary` → `--mdt-terracotta`
- JS en modules IIFE ou classes pour faciliter la migration React
- Commentaires sur les choix non évidents

**10. Performance + responsive polish**
- Factorisation SVG répétés en `<defs>` réutilisables
- Preload des weights de fonts effectivement utilisés uniquement (300, 400, 500 + italiques 300, 400)
- Galerie mobile : retravail du grid asymétrique pour préserver l'esthétique
- Hero mobile : booking card optimisée en taille
- Topbar mobile : compactage (probablement icônes seules sur <600px)
- Cible Lighthouse mobile : >90 sur tous les critères

## Critères d'acceptation (du brief)

- [ ] Tara dirait "oui, c'est exactement mon univers"
- [ ] Visiteur peut réserver en <30s depuis le hero
- [ ] Compréhension du concept en lisant uniquement le hero (test 5s)
- [ ] Responsive impeccable : iPhone SE (375px), iPad (768px), desktop 1440px, 4K (2560px)
- [ ] Lighthouse Mobile >90 partout
- [ ] Lighthouse a11y >95, navigation clavier complète
- [ ] Code lisible et migrable en React par un dev qui ne connaît pas le projet
- [ ] Aucun élément qui trahit l'ADN "luxe silencieux"

## Hors scope V1

- Intégration des vraies photos (placeholders SVG dans cette V1)
- Backend de réservation (formulaire = mockup non-fonctionnel)
- Backend newsletter (success message simulé uniquement)
- Page Calendrier complète (juste les 3 prochains événements sur la landing)
- Articles de blog réels (juste 2 cards d'aperçu)
- CMS / éditeur (phase 2)
- Multilingue (phase 2 si besoin)

## Livrable

Au terme de l'implémentation :
- `index.html`, `styles.css`, `scripts.js` côte à côte (double-clic = ça marche)
- Changelog en commentaire en tête de chaque fichier listant les améliorations vs V0
- Section TODO en commentaire fin de fichier pour ce qui reste à faire en V2

## Phase 2 (référence)

Voir [docs/phase-2/2026-05-27-stack-front-vitrine-design.md](../../phase-2/2026-05-27-stack-front-vitrine-design.md) pour la stack cible (TanStack Start + Supabase + Sanity) qui prendra le relais après validation de cette V1 par Tara.
