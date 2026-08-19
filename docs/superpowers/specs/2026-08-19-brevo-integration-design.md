# Intégration Brevo — Spécification

**Date :** 2026-08-19
**Projet :** Maison de Tara — admin (`app/`, branche `feat/socle-v3`) + site statique (`wandau-mdt`)
**Statut :** Design validé en dialogue, prêt pour plan d'implémentation
**Contexte amont :** tunnel de réservation public (migrations `20260819100000_public_booking.sql`,
`20260819110000_capacity_check.sql`), qui introduit le pattern de guichet public
`SECURITY DEFINER` réutilisé ici.

## Contexte

Une clé API Brevo existe déjà dans `app/.env` (`BREVO_API_KEY`) mais n'est utilisée nulle part
dans le code. Le site (`wandau-mdt`) est 100 % statique, sans backend propre : toute écriture
publique passe directement par des guichets Postgres (RPC `SECURITY DEFINER`, pattern déjà en
place pour les réservations). Aucun mécanisme n'existe aujourd'hui pour déclencher un envoi
d'email quand une ligne est insérée en base.

Deux formulaires du site sont aujourd'hui **figés** (`FORMS_READY=false` dans
`js/forms-supabase.js`, ciblent une table `submissions` qui n'existe pas) : newsletter et
contact/privatisation. Aucune des deux tables cibles réelles (`newsletter_subscribers`,
`requests`) n'a de policy RLS d'écriture publique.

## Périmètre — qui reçoit quoi

| Déclencheur | Email(s) envoyé(s) |
|---|---|
| Nouvelle réservation en ligne (`reservations`, `source='online'`) | Tara (alerte + lien `/admin/reservations`) **et** client (confirmation, même texte que le site : *"Tara vous recontacte pour confirmer et prendre l'acompte"*) |
| Réservation saisie manuellement par Tara dans l'admin | **Aucun email automatique** — elle gère la confirmation de vive voix |
| Inscription newsletter (`newsletter_subscribers`) | Visiteur uniquement (lien de confirmation double opt-in) |
| Demande contact/privatisation (`requests`) | Tara (alerte) **et** client (accusé de réception : *"bien reçu, on vous recontacte"*) |

## Architecture

```
Site statique (anon, fetch REST)
   │
   ├─▶ RPC subscribe_newsletter(email)         ─┐
   ├─▶ RPC submit_request(...)                  ├─▶ INSERT dans la table cible
   └─▶ RPC book_reservation(...) [existant]     ┘        │
                                                          │ trigger AFTER INSERT
                                                          ▼
                                          pg_net.http_post() → app admin (HTTPS)
                                          header secret (Supabase Vault, jamais en clair)
                                                          │
                                                          ▼
                                   app/src/routes/api.webhooks.brevo.ts
                                   (vérifie le secret, relit la ligne en service_role,
                                    compose le/les email(s), appelle Brevo)
                                                          │
                                                          ▼
                                              app/src/lib/brevo/client.ts
                                              → API Brevo (transactionnel + liste)
```

Le trigger Postgres ne fait que POSTer `{type, id}` — jamais le contenu métier complet. L'app
relit la ligne fraîche en `service_role` avant de composer l'email : évite qu'un payload de
webhook falsifié ou obsolète serve à envoyer un email trompeur, et garde toute la logique de
formatage/traduction en TypeScript plutôt qu'en SQL.

**Provisionnement du secret partagé** : une seule valeur aléatoire générée à l'implémentation,
stockée à deux endroits — dans Supabase Vault (`vault.create_secret`, lu par le trigger) et dans
les variables d'environnement Coolify de l'app (`BREVO_WEBHOOK_SECRET`, lu par
`api.webhooks.brevo.ts`). Aucune des deux copies ne transite par un fichier versionné dans git.

**Idempotence** : chaque table concernée (`reservations`, `newsletter_subscribers`, `requests`)
reçoit une colonne `notified_at timestamptz`. Le trigger ne POSTe que si `notified_at is null` ;
le handler webhook envoie l'email puis marque `notified_at = now()` avant de répondre. Un retry
du webhook (réseau, redémarrage) ne peut donc pas renvoyer le même email deux fois.

## Composants nouveaux

**Base de données** (nouvelle migration) :
- Extension `pg_net`.
- Secret partagé stocké via Supabase Vault (`vault.create_secret`), jamais en texte clair dans
  une migration versionnée dans git.
- Fonction trigger générique `public.notify_webhook()` + un trigger par table concernée
  (`reservations` filtré `source='online'`, `newsletter_subscribers`, `requests`).
- `public.subscribe_newsletter(p_email text) returns uuid` — `SECURITY DEFINER`, anon-exécutable.
  Upsert sur `email` : si la ligne n'existe pas, insertion `pending` (déclenche le trigger →
  email de confirmation). Si `unsubscribed`, régénère `confirm_token` et repasse `pending` (même
  effet, redéclenche l'email). Si déjà `pending` ou `confirmed`, aucune modification et **pas**
  de nouveau trigger — on ne renvoie pas d'email à chaque double-clic ni à un email déjà confirmé.
  Retourne l'id dans tous les cas (pas le token, jamais exposé au client).
- `public.submit_request(p_request_type, p_name, p_email, p_phone, p_message, p_party_size,
  p_desired_date, p_event_type) returns uuid` — `SECURITY DEFINER`, anon-exécutable, même famille
  de validations que `book_reservation` (champs requis, email plausible). `p_request_type` vaut
  `'contact'` ou `'privatisation'` ; `p_phone`/`p_party_size`/`p_desired_date`/`p_event_type` sont
  optionnels (`null` pour un simple message contact, remplis pour une privatisation — cf. formulaire
  ci-dessous).

**App (`app/src/`)** :
- `lib/brevo/client.ts` — client TS minimal : `sendTransactionalEmail()` (API
  `POST /v3/smtp/email`) + `addContactToList()` (optionnelle, voir plus bas). Clé lue via `env.ts`
  (nouvelle entrée validée, pas de `process.env` direct).
- `lib/brevo/templates.ts` — fonctions pures `nom → { subject, html }` pour chacun des 5 emails
  (Tara/réservation, client/réservation, newsletter/confirmation, Tara/demande, client/demande).
  HTML simple inline (pas de dépendance à un template Brevo créé dans leur dashboard — hors de
  mon contrôle).
- `routes/api.webhooks.brevo.ts` — `POST`, vérifie l'en-tête secret, dispatch selon `type`,
  relit la ligne concernée (service_role), envoie le/les email(s) via le client Brevo.
- `routes/newsletter.confirm.tsx` — page publique, lit `?token=`, passe le statut à `confirmed`,
  appelle `addContactToList()` si `BREVO_NEWSLETTER_LIST_ID` est configuré (sinon skip silencieux
  — permet d'activer le vrai sync de liste plus tard sans retoucher le code).
- `routes/admin/newsletter.tsx` + `lib/newsletter-data.ts` — nouvel écran admin, même famille que
  `/admin/reservations` (`staffMiddleware` obligatoire) : liste des inscrits (email, statut, date
  d'inscription/confirmation), lecture seule en v1. Ajouter `/admin/newsletter` à la nav (desktop
  **et** mobile) et au type `to:` de `AdminLink` dans `admin/route.tsx` — les deux existent déjà
  pour les 5 écrans actuels, facile à oublier pour un 6e.

**Site (`wandau-mdt`)** :
- Formulaire newsletter (`index.html`, `#newsletterForm`, déjà présent) rebranché sur
  `subscribe_newsletter`, à la place de `forms-supabase.js`/`submissions`.
- Formulaire contact (`contact.html`, `#contactForm`) : aujourd'hui juste nom/email/sujet/message,
  aucun champ ne permet de distinguer une demande de privatisation. **Décision (19/08) :** on
  ajoute un sélecteur Message / Privatisation (même pattern pills que le tunnel de réservation),
  qui révèle nombre de personnes / date souhaitée / type d'événement quand "Privatisation" est
  choisi. Rebranché sur `submit_request` à la place de `forms-supabase.js`/`submissions`.

## Sécurité

- La clé API Brevo ne vit que dans `app/.env` (jamais dans Postgres).
- Le secret webhook Postgres→app vit dans Supabase Vault, jamais en clair dans une migration.
- `subscribe_newsletter`/`submit_request` suivent le même modèle que `book_reservation` :
  `SECURITY DEFINER`, validations serveur, jamais de statut/champ sensible dicté par le client.
- `newsletter.confirm.tsx` est une page publique (pas d'auth) mais l'action est bornée par un
  token UUID imprévisible à usage unique (déjà dans le schéma existant : `confirm_token`).

## Erreurs — simplifications assumées en v1

Pas de file de réessai si Brevo ou le webhook échoue. La ligne (réservation/inscription/demande)
est de toute façon déjà en base et visible dans l'admin : l'email n'est qu'une alerte
complémentaire, jamais la source de vérité. Un échec est loggé côté app (logs Coolify), sans
bloquer ni l'écriture initiale ni l'expérience du visiteur.

## Pré-requis externes (déjà fait)

Expéditeur `Maison de tara <contact@maisondetara.com>` **vérifié** côté Brevo. DKIM par défaut
et DMARC non configuré : n'empêche pas l'envoi, augmente juste légèrement le risque spam —
amélioration DNS possible plus tard sur `maisondetara.com`, pas bloquant pour ce chantier.

## Déploiement

Nouvelles variables à ajouter aux env vars **Coolify** de l'app (pas seulement `app/.env` local,
même piège que les clés Supabase le 23/07) : `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`,
`BREVO_WEBHOOK_SECRET`, et `BREVO_NEWSLETTER_LIST_ID` si le sync de liste est activé.

## Tests prévus

- `lib/brevo/client.ts` et `templates.ts` : tests unitaires (fetch mocké), même esprit que les
  tests Monetico existants (vecteurs de référence, pas d'appel réseau réel).
- Les 2 nouvelles RPC : vérifiées comme `book_reservation` (transaction de test annulée avant
  commit, cf. migrations réservation) avant d'être considérées faites.
- `api.webhooks.brevo.ts` : test sur le rejet (401) sans le bon secret, test du dispatch correct
  par `type`, et test qu'un appel sur une ligne déjà `notified_at` renvoie sans ré-envoyer.
- Écran `/admin/newsletter` : au minimum vérifié manuellement par l'utilisateur en navigateur
  (comme le reste de l'admin cette session).

## Hors scope (reporté)

- Campagnes marketing Brevo (au-delà du simple ajout à une liste optionnelle).
- Actions en masse sur l'écran `/admin/newsletter` (export, désabonnement manuel) — lecture seule
  pour l'instant, à enrichir si le besoin se confirme à l'usage.
- Durcissement DKIM/DMARC du domaine.
- **Lien de désabonnement newsletter en self-service.** L'email de confirmation double opt-in
  n'en a pas besoin (transactionnel), mais le jour où Tara envoie de vraies campagnes depuis
  Brevo, la gestion du désabonnement se fera côté Brevo (leurs campagnes l'ajoutent
  automatiquement) — pas besoin de le construire nous-mêmes tant qu'on ne fait qu'ajouter à une
  liste.
- **Anti-abus sur `subscribe_newsletter`/`submit_request`.** Comme `book_reservation`, ces RPC
  sont anon-exécutables sans limite de fréquence — quelqu'un pourrait spammer des demandes.
  Risque accepté en v1 vu le volume attendu (petit commerce local) ; à revisiter si abus constaté
  (ex. limite par IP via une table de suivi, ou règle côté Supabase).
