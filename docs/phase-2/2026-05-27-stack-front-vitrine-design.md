# Stack Front Vitrine — Spécification

**Date :** 2026-05-27
**Projet :** Template réutilisable pour sites vitrines Propulseo (maison-de-tara et suivants)
**Statut :** Validé, prêt pour planification d'implémentation

## Objectif

Définir une stack front complète, professionnelle et réutilisable pour les sites vitrines Propulseo, capable d'évoluer vers de l'e-commerce sans réécriture majeure.

## Contraintes

- **Pas de backend lourd au démarrage** : pas de DB côté serveur pour cette phase (sera ajouté plus tard, probablement Supabase)
- **Contenu éditable par le client** via un CMS (pas de redéploiement pour changer un texte)
- **Déploiement sur VPS mutualisé** (Coolify) pour maîtriser les coûts sur plusieurs projets clients
- **TypeScript strict, pas de `any`** (règle globale CLAUDE.md)
- **Réutilisabilité** : le template doit servir de base à tous les futurs projets vitrines/e-com

## Architecture haut niveau

```
┌──────────────────────────────────────┐
│  VPS (Coolify)                       │
│  ┌────────────────────────────────┐  │
│  │ TanStack Start (Node/Nitro)    │  │
│  │  - Pages SSR                   │  │
│  │  - Server functions (contact)  │  │
│  └────────────────────────────────┘  │
└──────────┬─────────────┬─────────────┘
           │             │
           ▼             ▼
    ┌────────────┐  ┌────────────┐
    │  Sanity    │  │   Resend   │
    │  (CMS)     │  │  (emails)  │
    └────────────┘  └────────────┘
```

## Stack détaillée

### Cœur

| Brique | Version cible | Rôle |
|---|---|---|
| TanStack Start | latest | Routing + SSR + server functions |
| React | 19.x | Librairie UI |
| TypeScript | 6.x strict | Typage |
| Vite | 8.x | Build / dev server |
| Nitro | latest | Runtime serveur portable |

### UI & contenu

| Brique | Rôle |
|---|---|
| Tailwind v4 | CSS utility |
| class-variance-authority | Variantes de composants |
| clsx + tailwind-merge | Composition de classes |
| tw-animate-css | Animations Tailwind prêtes |
| Lucide React | Icônes |
| Motion (ex-Framer Motion) | Animations avancées (scroll, transitions) |
| Sanity + @sanity/image-url | CMS + optimisation images |
| Paraglide | i18n FR/EN (optionnel selon projet) |

### Formulaires & emails

| Brique | Rôle |
|---|---|
| react-hook-form | Gestion formulaires |
| Zod | Validation (côté client + server function) |
| Resend | Envoi d'email transactionnel (contact) |

### Qualité & tests

| Brique | Rôle |
|---|---|
| ESLint (@tanstack/eslint-config) | Linting |
| Prettier | Formatage auto |
| Vitest + Testing Library | Tests unitaires/composants |
| @t3-oss/env-core | Validation des variables d'env |
| TanStack Devtools | Debug routing + queries |

### Déploiement & CI

| Brique | Rôle |
|---|---|
| Dockerfile multi-stage | Image Node prod-ready |
| Coolify | Déploiement git push, SSL auto, monitoring |
| GitHub Actions | CI : type check + lint + tests à chaque push |

## Conventions

- **Path aliases** : `@/*` ou `#/*` vers `src/` (pas d'imports relatifs `../../`)
- **Max ~200 lignes par fichier** : au-delà, découper
- **Pas de styles inline** : Tailwind uniquement
- **Validation Zod systématique** sur tout input (form, env, API externe)
- **Variables d'env** validées au démarrage via `@t3-oss/env-core`

## Hors scope (à ajouter plus tard, pas maintenant)

- Base de données serveur (Postgres/Supabase)
- Authentification utilisateur (better-auth)
- Paiement (Stripe)
- Analytics (Plausible/PostHog)
- Suivi d'erreurs prod (Sentry)
- Espace client / dashboard

Ces briques s'ajouteront sans refonte grâce à TanStack Start (server functions) + Nitro (extensible).

## Critères de succès

Le template est considéré comme prêt quand :

1. `pnpm dev` lance le site en moins de 5 secondes
2. Un nouveau projet se clone et démarre en < 5 minutes (sans config manuelle)
3. Lint + types + tests passent en CI
4. Un push sur `main` déploie automatiquement en prod via Coolify
5. Un formulaire de contact fonctionne (saisie → validation Zod → envoi Resend → page de remerciement)
6. Le contenu d'une page est éditable via Sanity sans redéploiement

## Coût opérationnel

- **VPS Coolify mutualisé** : ~5-10 €/mois (héberge N sites)
- **Sanity** : gratuit (free tier large, suffisant pour vitrines)
- **Resend** : gratuit (100 emails/jour, largement assez pour contact)
- **GitHub Actions** : gratuit (2000 min/mois inclus)

**Total : 5-10 €/mois, indépendant du nombre de sites.**
