---
id: US-004
titre: Tara crée un événement privé, sans prix ni réservation en ligne, qui privatise la salle
statut: brouillon
version: 1
projet: Maison de Tara (site + admin)
---

# US-004 — Tara crée un événement privé, sans prix ni réservation en ligne, qui privatise la salle

## L'histoire

**En tant que** Tara, connectée à l'admin,
**je veux** créer un événement « privé » (sur invitation, formule négociée à part) sans avoir à
indiquer de prix,
**afin de** privatiser la Maison pour un client, sans que le public puisse réserver ni voir le détail
de l'événement.

**Exemple concret** : le 14 octobre, Tara crée « Syn'After – Synergie Entreprises » le 19/11 de
19 h 30 à 22 h 30. Elle coche « Événement privé », le champ prix disparaît, elle publie. Les
créneaux d'atelier libre de la soirée se ferment. Sur le calendrier du site, un visiteur voit au 19/11
« Soirée privée — la Maison est privatisée », sans titre, description, prix ni bouton de réservation.

## Limites (ce que l'US ne fait PAS)

- Pas de gestion des invités, de devis ni de paiement pour la privatisation : la formule reste gérée
  par Tara hors du site.
- Pas de changement pour les événements publics : prix d'au moins 1 €, payés en ligne (règle du 05/10).
- Le mécanisme de blocage des créneaux (privatisation, migration 20260929100000) est réutilisé tel quel.

## Critères d'acceptation

- **CA-01** — Étant donné le formulaire d'événement, quand Tara coche « Événement privé (sur
  invitation) », alors le champ prix disparaît et l'événement s'enregistre sans prix, en brouillon
  comme publié.
- **CA-02** — Étant donné un événement privé publié, quand il est enregistré, alors les créneaux
  d'atelier libre qui chevauchent ses horaires sont bloqués ; s'il repasse en brouillon ou est supprimé,
  ils se rouvrent (même règle que « Privatiser la salle »). En brouillon, rien n'est bloqué.
- **CA-03** — Étant donné un événement privé publié, quand un visiteur ouvre le calendrier du site,
  alors la date porte la mention « Soirée privée — la Maison est privatisée », avec l'horaire, sans
  titre, description, prix ni bouton de réservation ; il n'apparaît pas dans les rendez-vous de la
  page d'accueil.
- **CA-04** — Étant donné un événement privé, quand on interroge la base avec la clé publique du site
  (anon), alors son titre et sa description ne sont jamais renvoyés.
- **CA-05** — Étant donné un événement privé, quand un visiteur passe en mode « Événement » dans le
  formulaire de réservation, alors il n'est pas proposé ; et une demande de paiement envoyée
  directement pour cet événement est refusée.
- **CA-06** — Étant donné un événement privé, quand Tara consulte le Programme et l'agenda de
  l'admin, alors il porte une mention « Privé ».
- **CA-07** — Étant donné les événements existants, quand la mise à jour est déployée, alors ils
  restent publics et inchangés (prix, publication, privatisation).

## Faits et hypothèses

- **Fait** (`app/src/lib/events.ts:34-38`) : `priceCents` est obligatoire et ≥ 100 centimes, même
  en brouillon ; `canPublishEvent` exige aussi une fin et un prix.
- **Fait** (capture de Tara, 10/10) : « Le prix doit être d'au moins 1 € » à l'enregistrement d'un
  événement à 0 € avec « Privatiser la salle » coché.
- **Fait** (`supabase/migrations/20260929100000_event_privatisation.sql`) : colonne `privatise` ;
  `sync_event_privatisation` bloque les créneaux si l'événement est publié et privatisé.
- **Fait** (`supabase/migrations/20260715120300_events.sql:34-36`) : anon lit toutes les colonnes des
  événements publiés (`published = true`) ; `js/site-events.js:108` lit `events` directement
  (titre, description, prix) pour l'accueil et le calendrier.
- **Fait** (`supabase/migrations/20261005110000_event_price_view.sql`) : la vue
  `public_availability_events` (tunnel de réservation) liste tous les événements publiés à venir.
- **Fait** (`app/src/routes/api.reservations.checkout.ts:82-94`) : le paiement est refusé sans prix
  valide.
- **Décision** (Lyes, 14/10) : case « Événement privé » ; mention « Soirée privée » au calendrier ;
  blocage de la salle à la publication seulement.
- **Hypothèse** : nouvelle colonne `events.is_private` (défaut false) ; un événement privé est
  toujours privatisé ; la politique anon et la vue du tunnel excluent les privés ; une vue publique
  dédiée (ou des colonnes neutres) expose seulement date, heures et mention pour le calendrier.
- **Hypothèse** : le libellé exact affiché au public (« Soirée privée — la Maison est privatisée »)
  peut être rendu éditable plus tard ; ici il est fixe.
- **Hypothèse (tests)** : schéma et règles en Vitest ; CA-04 par requête anon réelle en lecture
  seule ; CA-03/05 par test navigateur du site avec Supabase simulé + test de l'API de paiement ;
  CA-02 par e2e admin sur un événement `[TEST]` créé puis supprimé.

## Questions ouvertes

Aucune.

## Relecture

<!-- rapport du sous-agent relecteur : critère visé · problème · bloquant oui/non · traitement -->

## Recette

| Critère | Preuve (test, capture, requête) | Commit | État |
|---|---|---|---|
| CA-01 | | | non vérifié |
| CA-02 | | | non vérifié |
| CA-03 | | | non vérifié |
| CA-04 | | | non vérifié |
| CA-05 | | | non vérifié |
| CA-06 | | | non vérifié |
| CA-07 | | | non vérifié |

## Historique

- 2026-10-14 — v1 brouillon (mail de Tara du 10/10 + capture ; choix de Lyes du 14/10).
