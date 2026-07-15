# Schéma base de données — Maison de Tara

Schéma complet de l'admin (toutes les tranches du cadrage), en migrations Supabase prêtes à
appliquer. Dérivé de [`docs/phase-2/2026-07-15-cadrage-admin-tara.md`](../../docs/phase-2/2026-07-15-cadrage-admin-tara.md).

## Ordre des migrations

| Fichier | Contenu |
|---|---|
| `20260715120000_extensions_profiles.sql` | Extensions, `set_updated_at()`, rôles, `profiles`, `is_admin()`/`is_staff()`, profil auto à l'inscription |
| `20260715120100_payments.sql` | `payments` (transactions Monetico : acomptes + bons) |
| `20260715120200_atelier_sessions.sql` | `session_templates` (grille hebdo) + `session_instances` (créneaux concrets) |
| `20260715120300_events.sql` | `events` (workshops datés, éditorial + réservable) |
| `20260715120400_reservations.sql` | `reservations` (atelier OU événement) + garde anti-surbooking |
| `20260715120500_gift_cards.sql` | `gift_cards` (session/montant) + `gift_card_redemptions` |
| `20260715120600_content.sql` | `journal_posts`, `gallery_items`, `site_settings` |
| `20260715120700_newsletter_requests.sql` | `newsletter_subscribers`, `requests` (privatisations/contact) |
| `20260715120800_storage.sql` | Buckets `medias` (public) et `documents` (privé) + policies |

Puis `../seed.sql` (infos pratiques + grille d'atelier exemple à valider).

## Modèle de sécurité (RLS)

RLS activée sur **toutes** les tables. Trois niveaux d'accès :

- **`service_role` (serveur)** : contourne la RLS. Toutes les écritures publiques passent par là —
  tunnel de réservation, webhook Monetico, inscription newsletter, formulaires de demande. La clé
  `service_role` est **secrète** (serveur uniquement, jamais exposée au navigateur).
- **`anon` (public)** : lecture seule du contenu public — créneaux d'atelier ouverts à venir,
  événements/journal/galerie **publiés**, infos pratiques. Aucune donnée client visible.
- **`authenticated` + rôle staff/admin** : accès complet à l'admin, via `is_staff()`/`is_admin()`.

## Comment appliquer

### Option A — au RDV, le plus rapide (zéro CLI, zéro Docker)

1. Créer le projet Supabase (**région Europe**, ex. `eu-west-3` Paris).
2. Dashboard → **SQL Editor** → coller le contenu de chaque `migrations/*.sql` **dans l'ordre du
   tableau** et exécuter, un par un. Puis coller `seed.sql`.
3. Dashboard → **Authentication** → créer le compte de Tara.
4. SQL Editor → la passer admin :
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'abidi.tara@gmail.com');
   ```
5. Récupérer dans **Project Settings → API** : `Project URL`, clé `anon`, clé `service_role`
   → à mettre dans `app/.env` (et plus tard dans Coolify). Voir
   [`docs/phase-2/2026-07-15-checklist-comptes.md`](../../docs/phase-2/2026-07-15-checklist-comptes.md).

### Option B — propre, pour la suite (CLI, sans Docker)

```bash
cd app
pnpm dlx supabase@2.109.1 login           # access token depuis supabase.com/dashboard/account/tokens
pnpm dlx supabase@2.109.1 init             # conserve les migrations déjà présentes
pnpm dlx supabase@2.109.1 link --project-ref <REF>
pnpm dlx supabase@2.109.1 db push          # applique les migrations au projet distant
```
(Le seed reste à appliquer à la main via le SQL Editor, ou `supabase db reset` en local.)

## Décisions à confirmer avec Tara (avant seed définitif)

- **Grille d'atelier** : jours/horaires réels des sessions + **capacité** par session (le seed propose
  un exemple mar–dim 10h/14h/17h, capacité 12/16 — à ajuster).
- **Montant de l'acompte** (≈ 6 €) et éventuel acompte des événements.
- **Durée de validité** des bons cadeaux (obligation légale FR — ex. 12 mois).
- **Infos pratiques** définitives : téléphone, adresse exacte, liens réseaux.

## Conventions

- Montants stockés en **centimes** (`*_cents`, entiers) — jamais de flottants.
- Horodatages en `timestamptz`. `updated_at` auto via trigger.
- Chemins d'images = chemins dans le bucket Storage (`medias`), pas d'URL en dur.
