# Paiement Stripe des réservations — conception

Cadré par grilling le 01/09/2026. Remplace la brique Monetico (jamais activée, faute
d'identifiants) : Tara a maintenant un compte Stripe.

## Contexte

- Le tunnel de réservation public (`C:/mdt-site/wandau-mdt/js/site-booking.js` +
  `atelier.html#reserver`) existe déjà et fonctionne : sélection atelier/événement,
  vérification de disponibilité en direct (`check_availability` RPC), soumission via
  `book_reservation` RPC (SECURITY DEFINER, anon).
- `book_reservation` crée aujourd'hui la réservation en `status='pending'` **avant**
  tout paiement — Tara recontacte ensuite le client pour l'acompte. C'est ce
  comportement qui change.
- `app/src/lib/monetico/` (signature HMAC, vérif retour) est testé mais devient mort :
  conservé tel quel, non branché, à retirer plus tard si Stripe est confirmé durable.
- Clés Stripe dans `app/.env` (jamais committé) : `STRIPE_SECRET_KEY`/
  `STRIPE_PUBLISHABLE_KEY` (live), `STRIPE_TEST_SECRET`/`STRIPE_TEST_PUBLISHABLE`
  (test). Développement et vérification entièrement en mode test.

## Décisions actées

1. **Portée : encaissement uniquement.** Pas de changement de date ni de remboursement
   automatisés. Le site affiche une mention (48h = remboursable, sinon changement de
   date via appel à Tara) ; toute la gestion post-réservation reste manuelle
   (téléphone + dashboard Stripe + admin). Petit chantier de contenu à part : ajouter
   cette mention sur la page atelier.

2. **Paiement d'abord, réservation ensuite.** Aucune ligne `reservations` n'est créée
   avant confirmation du paiement — évite de bloquer des places pour des paniers
   Stripe abandonnés (fréquent). Le prix à payer : risque rare de double réservation
   sur la toute dernière place pendant que deux clients sont sur Stripe en même temps
   → remboursement automatique + reservation refusée si la capacité a été prise entre
   temps (le trigger `check_reservation_capacity` existant s'en charge à l'insertion).

3. **Stripe Checkout hébergé** (pas de formulaire carte embarqué). Le client est
   redirigé vers la page Stripe, revient sur le site après paiement.

4. **Paiement stocké directement sur `reservations`** (pas de table `payments`
   séparée) : `stripe_checkout_session_id` (unique, sert d'idempotence webhook),
   `stripe_payment_intent_id`, `amount_cents`, `paid_at`. Une table dédiée n'a de sens
   que si un paiement peut exister sans réservation ou une réservation avoir
   plusieurs paiements — aucun des deux cas ici. `payments`/gift cards restent en
   base, inutilisés, à reprendre séparément si les bons cadeaux se construisent un
   jour.

5. **`book_reservation` retiré du chemin public** : `revoke execute ... from anon`.
   Remplacé par une nouvelle fonction SECURITY DEFINER, **service_role uniquement**
   (ex. `confirm_reservation_payment`), appelée seulement par le webhook Stripe.
   Reprend exactement les mêmes vérifications (créneau ouvert/événement publié,
   party_size 1-20, email valide, calcul du prix) mais insère directement en
   `status='confirmed'` avec les champs de paiement. Évite de dupliquer la logique
   métier en TypeScript.

6. **Nouvel endpoint serveur sur l'app admin** (`admin.maisondetara.propulseo-site.com`),
   pas sur le site statique — c'est le seul endroit où `STRIPE_SECRET_KEY` peut vivre
   en sécurité. Le site (autre origine) l'appelle en cross-origin : CORS restreint à
   l'origine du site uniquement. Avant de créer la session Stripe, vérifie la
   disponibilité (réutilise `check_availability`, déjà anon-safe).

7. **Retour après paiement** :
   - Succès → nouvelle page dédiée (même langage visuel que le site : hero calme,
     typo signature), contenu volontairement léger — l'email de confirmation
     existant (Brevo, `reservationConfirmationForCustomer`) porte déjà les détails,
     pas de duplication d'info dynamique sur la page.
   - Annulé → retour direct sur `atelier.html#reserver` (`?paiement=annule`), message
     inline, le client réessaie immédiatement. Pas de page dédiée : ici la vitesse
     prime sur la mise en scène.

8. **Montant** : 6€/personne pour l'atelier (fixe, inchangé). Pour les événements,
   reprend le réglage existant et modifiable par Tara dans l'admin Programme
   (`deposit_enabled` / `deposit_amount_cents`, désactivable). **Si le montant calculé
   est 0€** (acompte désactivé sur l'événement) : on saute Stripe entièrement, la
   réservation est créée directement en `confirmed` via la même fonction service_role,
   sans paiement. Ce cas n'arrive jamais pour l'atelier.

9. **Webhook** (`/api/webhooks/stripe`, app admin) : écoute `checkout.session.completed`
   uniquement. Authentification par signature Stripe (header `Stripe-Signature` +
   `STRIPE_WEBHOOK_SECRET`, à obtenir en enregistrant l'endpoint via l'API Stripe une
   fois le code déployé — pas besoin du dashboard, la clé secrète suffit).
   Idempotence : contrainte unique sur `stripe_checkout_session_id`, Stripe pouvant
   renvoyer le même événement plusieurs fois.

10. **Développement et vérification en mode test** (`STRIPE_TEST_SECRET`/
    `STRIPE_TEST_PUBLISHABLE`, cartes bidon `4242 4242 4242 4242`) de bout en bout.
    Bascule sur les clés live seulement à la mise en prod réelle, décision
    explicite à part.

## Hors périmètre (explicitement, pas oublié)

- Remboursement automatisé, changement de date automatisé.
- Table `payments` générique / bons cadeaux.
- Module `app/src/lib/monetico/` (laissé tel quel, non retiré).
- Bascule des clés live (étape distincte, volontaire, après vérification complète en test).
