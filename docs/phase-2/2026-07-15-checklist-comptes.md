# Checklist RDV Tara — création des comptes & mise en route

Objectif : au RDV, ne faire que **cliquer/créer les comptes** ; tout le reste (SQL, code) est prêt.
Date : 2026-07-15.

## 1. Supabase (base de données + auth + stockage)

- [ ] Créer un compte / projet Supabase sur https://supabase.com
- [ ] Nouveau projet **région Europe** (`eu-west-3` Paris de préférence) — cohérent RGPD.
- [ ] Choisir un mot de passe de base de données fort (le noter dans le gestionnaire de mots de passe).
- [ ] Appliquer le schéma : voir [`supabase/migrations/README.md`](../../supabase/migrations/README.md)
      → **Option A** (coller les migrations dans le SQL Editor, dans l'ordre) + `seed.sql`.
- [ ] Créer le compte de Tara dans **Authentication**, puis la passer `admin` (SQL fourni dans le README).
- [ ] Récupérer dans **Project Settings → API** et me transmettre :
  - [ ] `Project URL` (ex. `https://xxxx.supabase.co`)
  - [ ] clé **`anon`** (publique — OK à exposer côté navigateur)
  - [ ] clé **`service_role`** (⚠️ **SECRÈTE** — serveur uniquement)
- [ ] (Optionnel) créer un **access token** (Account → Access Tokens) pour le CLI (types + migrations).

Ces valeurs iront dans `app/.env` (jamais commité) puis dans Coolify.

## 2. GitHub (code + CI)

- [ ] Le dépôt distant existe déjà : `github.com/lyestriki-propulseo/maison-de-tara`.
- [ ] Vérifier l'accès en écriture (compte connecté / droits) pour pousser la branche `feat/socle-v3`.
- [ ] (Si compte Tara séparé souhaité) créer/ް inviter le compte de Tara en collaborateur.
- [ ] La CI GitHub Actions se déclenche toute seule au 1er push (workflow fourni en Tâche 6 du Socle).

## 3. Brevo (emails — nécessaire à partir de la Tranche 3)

- [ ] Créer un compte Brevo (https://www.brevo.com), plan gratuit.
- [ ] Récupérer une **clé API** (SMTP & API → API Keys).
- [ ] Vérifier/authentifier le **domaine d'envoi** (SPF/DKIM) pour la délivrabilité.
- [ ] Créer une **liste** newsletter + un **template** d'email (confirmation résa, rappel).

## 4. Monetico (paiement — nécessaire à partir de la Tranche 3)

- [ ] Confirmer le contrat **Monetico Paiement** (Monetico Online) — mono-marchand.
- [ ] Récupérer les identifiants **environnement de test** : numéro de TPE, **clé de sécurité**, code société.
- [ ] Plus tard : les identifiants **production**.
- Détails techniques : [`2026-07-15-monetico-integration-notes.md`](2026-07-15-monetico-integration-notes.md).

## 5. Coolify (hébergement — pour déployer le Socle)

- [ ] Instance Coolify accessible (VPS) + domaine.
- [ ] On y branchera le dépôt (build `app/Dockerfile`, port 3000, healthcheck `/api/health`) et les
      variables d'env Supabase — voir Tâche 7 du plan Socle.

---

**Ce qui est déjà prêt de mon côté** : tout le **schéma SQL** (9 migrations + seed + RLS + buckets),
le **plan du Socle V3** (en cours de construction par sous-agents), la **feuille de route** des 8 tranches,
et les **notes d'intégration Monetico**. Au RDV : créer les comptes, me passer les clés, et on branche.
