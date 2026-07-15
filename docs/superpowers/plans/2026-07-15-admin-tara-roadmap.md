# Admin Maison de Tara — Feuille de route (plan de plans)

> **Nature :** l'admin est composé de plusieurs sous-systèmes indépendants. Conformément
> au skill `writing-plans` (scope check), on **ne fait pas un plan unique géant** : on
> découpe en **tranches verticales** livrables et testables séparément, et **chaque plan
> détaillé est rédigé juste avant de construire la tranche** (pour ne pas qu'il périme).

**Sources figées :**
- Scope : [`docs/phase-2/2026-07-15-cadrage-admin-tara.md`](../../phase-2/2026-07-15-cadrage-admin-tara.md)
- Monetico : [`docs/phase-2/2026-07-15-monetico-integration-notes.md`](../../phase-2/2026-07-15-monetico-integration-notes.md)
- Stack : [`docs/phase-2/2026-05-27-stack-front-vitrine-design.md`](../../phase-2/2026-05-27-stack-front-vitrine-design.md)

**Base technique verrouillée :** dashboard sur-mesure **TanStack Start + React + Supabase**
(Postgres + Auth + Storage + RLS), une seule stack site + admin, un seul déploiement.

---

## Principe de séquençage

- **Tranches verticales** (DB + logique + UI + test de bout en bout), pas de couches horizontales.
- Chaque tranche = **logiciel qui marche et se teste seul**, avec un **critère de recette** clair.
- **TDD** là où ça a du sens (surtout la brique Monetico), **commits fréquents**, PRs ciblées.
- On rédige le **plan détaillé de la tranche N** seulement quand on l'attaque.

## Dépendances

```
1. Socle V3 ─┬─► 2. Brique Monetico (pure) ─┐
             │                               ├─► 3. Réservation atelier + agenda
             │                               │        │
             │                               │        ├─► 4. Workshops / événements
             │                               │        │
             │                               └────────┴─► 5. Bons cadeaux (2e flux Monetico)
             │                                                │
             │                                                └─► 6. Caisse « chef d'orchestre »
             │
             └─► 7. Contenu (journal · galerie visuelle · infos)
                 └─► 8. Newsletter · Demandes · RGPD · dashboard · rappels (transverses & finition)
```

---

## Les 8 tranches

### Tranche 1 — Socle V3  *(plan détaillé : à écrire en premier)*
Échafauder l'app : TanStack Start + React + TS strict + Tailwind v4 + Vitest + ESLint/Prettier ;
Supabase branché (Postgres + Auth + Storage) ; validation des variables d'env ; Dockerfile +
déploiement Coolify + CI GitHub Actions ; **coquille d'admin** : page login → route protégée
(dashboard vide).
**Recette :** l'app boote (`pnpm dev`), la CI passe, le push déploie sur Coolify, le login
fonctionne, la route admin est bloquée sans session.

### Tranche 2 — Brique paiement Monetico *(pure, sans identifiants)*
Bibliothèque de signature : transformation de la clé « utilisable », HMAC-SHA1 (encodage
iso-8859-1), construction de la chaîne à signer (ordre des champs), builder du form phase 1,
vérification + accusé phase 2. **100% TDD**, aucune UI, aucun identifiant réel requis.
**Recette :** tests unitaires verts, MAC conforme sur vecteurs connus, accusé `version=2\ncdr=0`
au bon format, idempotence vérifiée.

### Tranche 3 — Réservation atelier + agenda *(cœur de valeur)*
Modèle de données (grille hebdo → créneaux générés, capacité, réservations) ; tunnel public
(choisir créneau + nb pers → résa *en attente* → phase 1 Monetico → page hébergée → webhook
phase 2 confirme → email de confirmation via Brevo) ; agenda admin (vue jour/semaine +
remplissage) ; **ajout manuel**, **blocage** créneau/journée, **ajustement capacité**,
annulation/report gérés par Tara.
**Recette :** un visiteur réserve + paie (env. test Monetico) → résa confirmée dans l'admin +
email envoyé ; bloquer une journée refuse la résa en ligne ; une résa manuelle décrémente la capacité.

### Tranche 4 — Workshops / événements
Entité événement daté (titre, date/heure, type, description, capacité, image, acompte oui/non),
réservable en ligne (réutilise le tunnel + Monetico de la tranche 3), CRUD admin.
**Recette :** créer un événement → visible sur le site → réservable → confirmé après paiement.

### Tranche 5 — Bons cadeaux *(2e flux Monetico)*
Deux types : « session » (prix fixe, usage unique) et « montant » (avec **suivi de solde**) ;
achat en ligne (2e flux Monetico) → code + PDF envoyés par email ; **utilisation sur place**
dans l'admin (marquer utilisé / décompter le solde) ; durée de validité (obligation FR).
**Recette :** acheter un bon → code reçu par email → le saisir sur place décompte le solde /
marque « utilisé » ; un bon expiré est refusé.

### Tranche 6 — Caisse « chef d'orchestre » *(non-fiscale)*
Écran d'encaissement qui **assemble** : résa + acompte déjà payé + solde de bon applicable +
**total à encaisser** ; **aucun enregistrement fiscal** (pas de ticket, pas de NF525) ;
le paiement réel + ticket restent sur le terminal certifié tiers.
**Recette :** ouvrir une résa à l'encaissement → affiche l'acompte payé + le bon applicable →
calcule le total, sans rien enregistrer fiscalement.

### Tranche 7 — Contenu éditorial
Journal (éditeur léger + création de nouveaux articles, SEO auto) ; **galerie visuelle**
(choisir LA grande photo, régler tailles/mise en avant, **rendu identique au site**,
glisser-déposer, optimisation image) ; infos pratiques (horaires/adresse/tél/réseaux) ;
**bouton « prévisualiser »** (vraie page, brouillon). Périmètre verrouillé côté marque/design.
**Recette :** publier un article → visible sur le site ; réordonner la galerie → le site reflète ;
prévisualiser un brouillon avant publication.

### Tranche 8 — Newsletter · Demandes · RGPD · dashboard · rappels
Newsletter : collecte double opt-in → synchro Brevo ; **envoi déclenché depuis l'admin via
l'API Brevo** (template + liste). Demandes/devis : boîte dans l'admin (statuts) + notif email.
RGPD : politique + rétention + suppression manuelle. Dashboard d'accueil (résas du jour +
remplissage, demandes, bons vendus, inscrits). **Rappel 24-48 h** (tâche planifiée).
**Recette :** s'inscrire → apparaît dans Brevo ; envoyer via un template → part par Brevo ;
soumettre une privatisation → fiche + email ; le rappel se déclenche à l'heure prévue.

---

## Préconditions (à réunir en parallèle du build)

- **Identifiants Monetico** : environnement **test** (bloque la recette de bout en bout des
  tranches 3 et 5, pas le code) puis **prod**. → à récupérer via le contrat Monetico Online de Tara.
- **Projet Supabase** (ou Postgres sur Coolify) provisionné, **région Europe**.
- **VPS Coolify** + domaine + certificats.
- **Compte Brevo** (clé API transactionnel + clé API, templates créés).
- Contenu de départ (2-3 articles Journal, photos galerie) fourni par Propul'SEO.

## Ce qui est reporté en v2 (rappel)

Report/annulation self-service · remboursements Monetico automatisés · bon cadeau utilisable
en ligne au checkout · rappels SMS · rôles multi-employés · blog complet SEO · e-commerce boutique.

---

*Feuille de route produite avec le skill writing-plans · 2026-07-15. Le plan détaillé de la
Tranche 1 suit ; les tranches 2→8 seront détaillées juste avant leur construction.*
