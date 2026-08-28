# Maison de Tara — Plan complet du travail restant

**Date :** 2026-07-15 · **Branche :** `feat/socle-v3` (non mergée)
**Sources :** [cadrage](../../phase-2/2026-07-15-cadrage-admin-tara.md) · [feuille de route](2026-07-15-admin-tara-roadmap.md) · [Monetico](../../phase-2/2026-07-15-monetico-integration-notes.md)

Légende : ✅ fait · 🔶 partiel · ⬜ à faire · 🔒 bloqué (dépendance externe)

---

## ✅ Déjà fait

- **Socle V3** : app TanStack Start + React 19 + TS strict + Tailwind v4 + Vitest, auth email/mdp, route `/admin` protégée, healthcheck, Dockerfile, CI (typecheck/lint/test/build). Revu (Opus) + durci.
- **Base Supabase live** : 13 tables + RLS + buckets + seed appliqués ; **types générés** depuis la base.
- **Brique Monetico** : signature (clé + HMAC-SHA1 iso-8859-1), phase 1, phase 2 — testée contre les vecteurs du kit officiel.
- **Admin (début)** : dashboard temps réel + **Agenda peuplé** (34 créneaux, vraies données), navigation.
- **Landing** : boutons terracotta → **vert sauge**.
- Outillage DB sans Docker (scripts apply-migrations / gen-types / seed-schedule).

---

## Phase A — Réservations atelier *(finir la Tranche 3)*

- 🔶 **Agenda** : lecture faite. Reste : cliquer un créneau → **panneau détail** (liste des résas).
- ⬜ **Bloquer** un créneau / une journée (férié, privatisation) depuis l'admin.
- ⬜ **Ajouter une résa manuelle** (téléphone/sur place) → décrémente la capacité (trigger déjà en place).
- ⬜ **Écran « définir la grille »** (self-service) : Tara saisit jours/horaires/capacité + génère les créneaux (remplace le seed d'exemple).
- ⬜ **Ajuster la capacité** ponctuelle d'un créneau.
- 🔒 **Tunnel de réservation public** : choisir créneau + nb pers → résa `pending` → **phase 1 Monetico** → page hébergée → **webhook phase 2** confirme → **email de confirmation** (Brevo). *Attend les identifiants Monetico test.*
- 🔒 **Rappel 24-48 h** avant la session (tâche planifiée + Brevo).
- ⬜ **Annulation / report** gérés par Tara dans l'admin.
- ⬜ **Liste des réservations** (admin) : recherche, statut, no-show.

## Phase B — Événements / Workshops *(Tranche 4)*

- ⬜ **CRUD admin** : créer/éditer un événement (titre, date/heure, type, description, capacité, image, acompte oui/non, publier).
- ⬜ **Affichage public** dans le calendrier (événements publiés).
- 🔒 **Réservable en ligne** (réutilise le tunnel + Monetico de la Phase A).

## Phase C — Bons cadeaux *(Tranche 5)*

- ⬜ **Deux types** : « session » (prix fixe) et « montant » (avec suivi de solde).
- 🔒 **Achat en ligne** (2ᵉ flux Monetico) → **code + PDF** envoyés par email.
- ⬜ **Utilisation sur place** (admin) : saisir le code → marquer utilisé / décompter le solde.
- ⬜ **Validité** (durée légale FR) + états (actif/utilisé/expiré).

## Phase D — Caisse « chef d'orchestre » *(Tranche 6, non-fiscale)*

- ⬜ Écran d'encaissement : assemble résa + acompte payé + solde bon + **total à encaisser**.
- ⬜ **Aucun enregistrement fiscal** (le paiement réel + ticket restent sur un terminal certifié tiers). Évite NF525.

## Phase E — Contenu éditorial *(Tranche 7)*

- ⬜ **Journal** : éditeur léger (titre, image, texte riche, date) + création + SEO auto.
- ⬜ **Galerie** : éditeur visuel (choisir LA grande photo, tailles/mise en avant, **rendu réel**), upload, optimisation image.
- ⬜ **Infos pratiques** : éditer horaires/adresse/téléphone/réseaux (table `site_settings` déjà seedée).
- ⬜ **Bouton « prévisualiser »** (vraie page, brouillon).

## Phase F — Newsletter & Demandes *(Tranche 8)*

- ⬜ **Newsletter** : collecte double opt-in → **synchro Brevo** ; **envoi déclenché depuis l'admin via l'API Brevo** (clé déjà dans `.env`).
- ⬜ **Boîte de demandes** (privatisations groupe + contact) : fiches avec statut + **notif email** à Tara.

## Phase G — Site public *(migration de la landing dans l'app)*

- ⬜ **Migrer la landing Wandau** (`wandau-mdt/` statique) dans l'app TanStack — aujourd'hui `localhost:3000` = l'admin, pas le site.
- ⬜ **Brancher le module de réservation** dans le hero (tunnel Phase A).
- ⬜ **Contenu depuis Supabase** (événements, journal, galerie, horaires publiés).

## Phase H — Transverses & finition

- ⬜ **Dashboard enrichi** : résas du jour + remplissage, demandes, bons vendus, inscrits.
- ⬜ **RGPD** : page confidentialité + CGV, rétention (~3 ans), suppression manuelle.
- ⬜ **Rôles** : comptes employés (staff) à droits limités (base déjà prête : rôles `admin`/`staff`/`client`).
- ⬜ **⚠️ Retirer le contournement dev** (`admin/route.tsx`) + activer le **vrai login** avant prod.
- ⬜ **Style/UX admin** : typo Cormorant, header, cartes, cohérence MDT (« luxe silencieux »).
- ⬜ **Accessibilité** (focus, contrastes, clavier) + responsive admin.

## Phase I — Infra & déploiement 🔒

- 🔒 **Monetico** : récupérer identifiants **test** (TPE, clé, société) puis **prod** — 2 flux (acompte + bon cadeau).
- 🔒 **Brevo** : templates (confirmation, rappel), authentifier le domaine (SPF/DKIM), listes.
- 🔒 **Coolify** : brancher le repo (Dockerfile `app/`, port 3000, healthcheck, variables d'env, domaine, SSL).
- ⬜ **CI** : premier `git push` → vérifier GitHub Actions au vert. **Vérifier le build Docker** (Docker absent en local).
- ⬜ **Supabase hardening** : désactiver les inscriptions publiques (défense en profondeur) ; décider TLS migrations (sslmode=require assumé, ou CA/pooler pour verify-full).
- ⬜ **Merger `feat/socle-v3`** vers `main` (revue) une fois un jalon stable atteint.

---

## Dépendances externes (à réunir)

| Dépendance | Débloque | Statut |
|---|---|---|
| Identifiants Monetico **test** | Tunnel résa e2e, événements, bons cadeaux | 🔒 en attente |
| Identifiants Monetico **prod** | Mise en prod des paiements | 🔒 plus tard |
| Brevo (templates + domaine) | Emails confirmation/rappel/newsletter | 🔶 clé API fournie, reste templates+domaine |
| Instance Coolify + domaine | Déploiement | 🔒 en attente |
| Décisions Tara | Vraie grille (horaires/capacité), acompte, validité bons, horaires/adresse | 🔶 exemple en place |

## Séquence recommandée

1. **Finir la Phase A côté admin** (sans Monetico) : détail créneau + blocage + résa manuelle + écran « définir la grille ». *Rend l'atelier réellement pilotable.*
2. **Phase E (contenu) + F (newsletter/demandes)** : autonomes, forte valeur, aucun blocage externe.
3. **Dès les identifiants Monetico test** : tunnel de réservation (Phase A) → événements (B) → bons cadeaux (C).
4. **Caisse (D)** une fois résas + bons en place.
5. **Site public (G)** : migrer la landing + brancher la réservation.
6. **Finition (H) + Infra/déploiement (I)** en continu, et **avant prod** : retirer le bypass, vrai login, RGPD, Coolify.

## Definition of Done « avant mise en prod »

- [ ] Contournement dev retiré, login réel obligatoire, comptes créés (Tara admin)
- [ ] 2 flux Monetico prod fiabilisés (acompte + bon cadeau) + webhooks idempotents
- [ ] Emails Brevo (confirmation, rappel) délivrables (SPF/DKIM)
- [ ] RGPD (confidentialité, CGV, rétention) en place
- [ ] Déploiement Coolify OK (healthcheck, SSL, variables d'env) + CI verte
- [ ] Inscriptions publiques Supabase désactivées
- [ ] Vraie grille + contenu validés avec Tara (plus de données d'exemple)
