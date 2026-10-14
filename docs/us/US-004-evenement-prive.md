---
id: US-004
titre: Tara crée un événement privé, sans prix ni réservation en ligne, qui privatise la salle
statut: livree
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
- Le fichier de repli du calendrier (`data/events.json`, base injoignable) ne contient pas d'événement
  privé : accepté.
- Une session de paiement Stripe ouverte juste avant le passage en privé peut encore aboutir (le
  webhook ne vérifie que `published`) : cas limite accepté, couvert par l'avertissement de CA-07.

## Critères d'acceptation

- **CA-01** — Étant donné le formulaire d'événement, quand Tara coche « Événement privé (sur
  invitation) », alors les champs prix et places disparaissent, « Privatiser la salle » est coché et
  verrouillé, et l'événement s'enregistre sans prix, en brouillon comme publié ; le bouton « Publier »
  de la liste du Programme fonctionne aussi pour un brouillon privé.
- **CA-02** — Étant donné un événement privé publié, quand il est enregistré, alors les créneaux
  d'atelier libre qui chevauchent ses horaires sont bloqués ; s'il repasse en brouillon ou est supprimé,
  ils se rouvrent. En brouillon, rien n'est bloqué.
- **CA-03** — Étant donné un événement privé publié et à venir, quand un visiteur ouvre le calendrier
  du site, alors la date porte la mention « Événement privé — la Maison est privatisée » avec
  l'horaire, sans titre, description, type, prix ni bouton de réservation ; il n'apparaît pas dans les
  rendez-vous de la page d'accueil ; les événements publics gardent leur affichage, leur prix et leur
  bouton « Réserver ».
- **CA-04** — Étant donné un événement privé publié, quand on interroge la base avec la clé publique
  du site (anon) — table `events`, vue du tunnel `public_availability_events`, nouvelle vue du
  calendrier —, alors son titre et sa description ne sont jamais renvoyés.
- **CA-05** — Étant donné un événement privé, quand un visiteur passe en mode « Événement » dans le
  formulaire de réservation, alors il n'est pas proposé ; et une demande de paiement envoyée
  directement pour cet événement est refusée, même s'il avait un prix avant de passer en privé.
- **CA-06** — Étant donné un événement privé, quand Tara consulte l'admin, alors il porte un badge
  « Privé » dans le Programme (à la place de « Prix à définir ») ; et dans l'agenda, les créneaux
  bloqués par une privatisation affichent « Privatisé : <titre> » au lieu de « Bloqué » (privés et
  privatisations publiques).
- **CA-07** — Étant donné un événement qui a déjà des réservations, quand Tara le passe en privé,
  alors l'admin l'autorise après un avertissement clair (« Cet événement a déjà N réservation(s) :
  pense à prévenir et rembourser ces clients ») ; les événements existants, eux, restent publics et
  inchangés au déploiement.

## Faits et hypothèses

- **Fait** (`app/src/lib/events.ts:35-39`) : `priceCents` est obligatoire et ≥ 100 centimes, même
  en brouillon ; `canPublishEvent` exige une fin et un prix, à l'écran (`programme.tsx:124`) et côté
  serveur (`events-data.ts:116-118`).
- **Fait** (capture de Tara, 10/10) : « Le prix doit être d'au moins 1 € » à l'enregistrement d'un
  événement à 0 € avec « Privatiser la salle » coché.
- **Fait** (`supabase/migrations/20260929100000_event_privatisation.sql`, `admin-data.ts:355-359`) :
  colonne `privatise` ; les créneaux sont bloqués si l'événement est publié et `privatise = true`.
- **Fait** (`AgendaWeekCalendar.tsx:159`, `AgendaManager.tsx:226`, `admin-data.ts:54`) : l'agenda
  n'affiche pas les événements ; un créneau privatisé apparaît « Bloqué », la note « Privatisé :
  <titre> » est chargée mais non affichée.
- **Fait** (`supabase/migrations/20260715120300_events.sql:34-36`) : anon lit toutes les colonnes des
  événements publiés ; `js/site-events.js:108` lit `events` directement pour l'accueil et le calendrier.
- **Fait** (`app/src/routes/api.reservations.checkout.ts:81-94`) : l'API de paiement lit `events` avec
  la clé service (ni la politique anon ni la vue ne la protègent) et refuse un événement sans prix.
- **Fait** : les e2e admin tournent contre la base de production.
- **Décision** (Lyes, 14/10) : case « Événement privé » ; mention « Événement privé — la Maison est
  privatisée » au calendrier ; blocage à la publication ; badge Programme + mention dans l'agenda ;
  passage en privé autorisé avec avertissement s'il y a des réservations.
- **Hypothèse** : colonne `events.is_private` (défaut false) + contrainte `check (not is_private or
  privatise)` ; en privé, prix vidé en base (`deposit_enabled = false`, montant null) et l'API de
  paiement refuse explicitement `is_private`.
- **Hypothèse** : la politique anon sur `events` et la vue du tunnel excluent les privés ; une vue
  publique dédiée n'expose que date, heure de début et de fin des privés publiés, avec le même filtre
  de dates que le calendrier (jusqu'à la fin de la journée, heure de Paris) — ni `id`, ni type.
  `loadEvents()` fait un second appel ; si cet appel seul échoue, le calendrier reste affiché sans
  les privés (pas de bascule sur le repli). Mise en ligne : migration, puis site.
- **Hypothèse** : la réservation manuelle de l'admin ne propose pas les événements privés.
- **Hypothèse** : toute nouvelle fonction SECURITY DEFINER est révoquée explicitement pour anon et
  authenticated ; `programme.tsx` (274 l.) et `site-booking.js` (317 l.) sont découpés s'ils grossissent.
- **Hypothèse (tests)** : schéma et règles en Vitest ; CA-04 : un événement `[TEST]` privé publié créé
  avec la clé service, les 3 accès interrogés en anon, puis supprimé (visible quelques secondes en
  prod, comme l'e2e de privatisation actuel) ; CA-03/05 : banc de test du site (simulateur étendu à
  la nouvelle vue) + test de l'API de paiement, y compris un événement passé en privé avec ancien prix ;
  CA-02/06/07 : e2e admin sur un événement `[TEST]` créé puis supprimé.

## Relecture

Relecture du 14/10 (sous-agent, n'a pas participé à la rédaction). Code lu : `events.ts`,
`events-data.ts`, `EventForm.tsx`, `programme.tsx`, agenda admin (`AgendaManager`,
`AgendaWeekCalendar`, `admin-data.ts`), `reservations-data.ts`, `api.reservations.checkout.ts`,
migrations events / privatisation / public_booking / capacity_check / stripe / price_view, site
(`site-events.js`, `home-events.js`, `premium-calendrier.js`, `site-booking.js`, `data/events.json`),
e2e `programme.e2e.ts`, `e2e/support/db.ts`, `e2e-site/support/supabase-mock.ts`.

**Verdict : 2 bloquants (R-01, R-02), le reste est à trancher ou à préciser.**

| # | Critère | Problème | Bloquant |
|---|---|---|---|
| R-01 | CA-06 | L'agenda admin n'affiche **aucun événement** : il ne montre que des créneaux d'atelier, et un créneau bloqué par privatisation affiche « Bloqué » comme un blocage manuel (`AgendaWeekCalendar.tsx:159`, `AgendaManager.tsx:226`). La note « Privatisé : <titre> » est chargée (`admin-data.ts:54`) mais affichée nulle part. « Il porte une mention Privé dans l'agenda » n'a donc pas d'endroit où s'afficher : le constructeur devrait inventer l'interface (sur le créneau bloqué ? dans le panneau du créneau ? un bandeau du jour ?). Préciser où et quoi, ou limiter CA-06 au Programme. | **oui** |
| R-02 | CA-04 (preuve) | La preuve prévue (« requête anon réelle en lecture seule ») ne prouve rien s'il n'y a aucun événement privé publié en base : une liste vide passe même si la règle est fausse. Il faut un événement `[TEST]` privé **publié**, créé avec la clé service, puis interroger en anon les 3 portes : table `events`, vue `public_availability_events`, et la nouvelle vue publique (qui ne doit renvoyer ni `title` ni `description`). Ensuite supprimer (le nettoyage `cleanupTestData` le fait déjà par préfixe). À noter : les e2e tournent sur la base de prod, donc l'événement apparaîtra quelques secondes sur le vrai calendrier en « Soirée privée » (déjà le cas aujourd'hui avec l'e2e de privatisation, qui expose même le titre `[TEST]`). | **oui** (vérif) |
| R-03 | CA-03 / CA-04 | Masquer titre et description **par colonnes** est impossible ligne par ligne, et retirer à anon le droit sur `title`/`description` ferait échouer la requête du site (`site-events.js:108` demande ces colonnes) : le `catch` bascule alors l'accueil ET le calendrier sur le fichier de repli. Seule voie viable : la règle anon exclut les privés + une vue dédiée (date, heures, mention). L'hypothèse « ou des colonnes neutres » est à retirer. Conséquence côté site : `loadEvents()` (partagé par `home-events.js` et `premium-calendrier.js`) doit faire un 2e appel et fusionner ; l'accueil doit filtrer les privés ; le calendrier doit afficher l'entrée sans tag/prix/bouton. Points à fixer : l'échec du seul appel « privés » ne doit pas faire basculer tout le calendrier sur le repli ; ordre de mise en prod migration puis site (sinon la vue n'existe pas encore) ; cache Cloudflare JS de 4 h. | non (à préciser) |
| R-04 | CA-05 | L'API de paiement lit `events` avec la clé **service** (`checkout.ts:81-86`) : ni la règle anon ni la vue du tunnel ne la protègent. Aujourd'hui le refus viendrait seulement de l'absence de prix (`:91`). Piège : si Tara passe en privé un événement qui avait un prix, le formulaire cache le champ mais `priceEuros` garde sa valeur et `upsertEvent` écrit `deposit_amount_cents = priceCents` → le paiement serait accepté. Il faut soit vider le prix en base pour un privé, soit un contrôle explicite `is_private` dans l'API (les deux, idéalement). Le test de l'API doit couvrir « privé avec un prix encore en base ». | non (critique à l'implémentation) |
| R-05 | CA-01 | Le bouton **Publier/Dépublier de la liste** passe par un autre chemin que le formulaire : contrôle client `togglePublish` (`programme.tsx:124`) et serveur `setEventPublished` (`events-data.ts:116-118`), tous deux via `canPublishEvent` qui exige un prix. Un brouillon privé ne pourrait donc pas être publié depuis la liste (« Ajoutez une heure de fin et un prix avant de publier »). CA-01 ne parle que de l'enregistrement : préciser que la publication depuis la liste marche aussi, et la tester. | non (à ajouter) |
| R-06 | CA-02 | « Privé ⇒ privatisé » doit être **stocké** `privatise = true`, pas seulement déduit : la fonction SQL teste `v_event.privatise` et la régénération des créneaux (`admin-data.ts:355-359`) filtre `.eq('privatise', true)`. Sinon les créneaux générés plus tard ne seraient pas bloqués. Une contrainte `check (not is_private or privatise)` éviterait l'écart. À trancher aussi : la case « Privatiser la salle » quand « privé » est cochée (cachée ? cochée et grisée ?) et ce que devient `privatise` si Tara décoche « privé ». | non (à trancher) |
| R-07 | CA-01 / CA-07 | **Réservations existantes** non traitées : passer en privé un événement public qui a déjà des réservations payées (Stripe) ? À interdire ou à signaler. Et le formulaire de réservation manuelle de l'admin propose tous les événements publiés à venir (`reservations-data.ts:184-189`), privés compris : une résa manuelle sur un privé empêche ensuite sa suppression (`reservations.event_id … on delete restrict`), ce qui contredit « s'il est supprimé, ils se rouvrent » (CA-02). | non (à trancher) |
| R-08 | CA-03 | Le fichier de repli `data/events.json` contient 4 événements fictifs (03/10 au 07/11/2026) : en cas de panne Supabase, le calendrier montre ces faux rendez-vous et aucun privé. Dire si c'est accepté pour CA-03 (aucun privé dans le repli). | non |
| R-09 | CA-03 | Libellé fixe « Soirée privée » quel que soit le type ou l'heure (un atelier privé à 10 h serait affiché « Soirée privée »). Et quel tag dans le calendrier (Atelier / Événement / aucun) ? La vue ne devrait exposer ni `event_type` ni `id` si on veut rester minimal. | non (à trancher) |
| R-10 | CA-03 | **Dates passées / jour même** : les événements publics restent affichés jusqu'à la fin de la journée (filtre `keepUpcoming` par date de Paris), alors que la vue du tunnel filtre `starts_at >= now()`. Pour la nouvelle vue, choisir le même filtre que le calendrier (sinon la soirée privée disparaît à 19 h 30 alors que les événements publics du jour restent) et ne pas exposer l'historique des dates privées. | non |
| R-11 | CA-06 | Programme : la ligne affiche « Prix à définir » quand le prix est 0 (`programme.tsx:205`) ; il faut remplacer par « Privé ». `listEvents` et `edit()` doivent remonter/recharger le drapeau. | non |
| R-12 | CA-03 (tests) | Le banc du site (`supabase-mock.ts`) renvoie `[]` pour la table `events` et ne connaît pas la nouvelle vue : à étendre. Il ignore les filtres de requête, donc il ne prouve que l'affichage (le filtrage est prouvé par CA-04). Ajouter un cas de non-régression : un événement public garde prix et bouton « Réserver » sur l'accueil et le calendrier. | non |
| R-13 | Faits | Exacts sur le fond. Petites corrections : prix dans `events.ts` aux lignes 35-39 (pas 34-38) ; refus du paiement à `checkout.ts:91-93`. Faits manquants utiles : l'API lit en clé service (R-04), l'agenda n'affiche pas les événements (R-01), la régénération filtre `privatise` (R-06), les e2e admin tournent sur la prod. | non |
| R-14 | CA-05 | Cas limite : une session Stripe ouverte avant le passage en privé est confirmée par le webhook (`confirm_reservation_payment` ne vérifie que `published`). Rare, à accepter ou à bloquer. | non |
| R-15 | CA-01 | Le champ « Places » reste obligatoire (schéma 1-200, base `capacity > 0`) alors qu'il n'a pas de sens pour un privé : garder la valeur par défaut cachée ou le laisser visible ? | non |
| R-16 | Règles projet | `programme.tsx` (274 lignes) et `site-booking.js` (317) dépassent déjà ~200 lignes ; prévoir un découpage si la logique « privé » s'y ajoute. Penser aux grants : toute nouvelle fonction SECURITY DEFINER doit être révoquée explicitement pour anon et authenticated ; une vue publique n'a besoin que d'un `grant select … to anon`. | non |

**Traitement (2026-10-14, rédacteur)** — bloquants : R-01 → CA-06 (décision : badge Programme + « Privatisé : <titre> » dans l'agenda) ; R-02 → hypothèse de test CA-04. Intégrés : R-03 (vue dédiée, plus de « colonnes neutres »), R-04 (prix vidé + contrôle API, CA-05), R-05 (CA-01), R-06 (contrainte, CA-01), R-07 (décision : autorisé avec avertissement, CA-07 ; réservation manuelle sans privés), R-08 et R-14 (Limites), R-09 (décision : « Événement privé »), R-10 (filtre de dates), R-11 (CA-06), R-12 (tests), R-13 (faits), R-15 (places masquées), R-16 (hypothèse).

## Recette

| Critère | Preuve (test, capture, requête) | Commit | État |
|---|---|---|---|
| CA-01 | `events.test.ts` « CA-01 » ×3 ; `e2e/evenement-prive.e2e.ts` « CA-01/02/04/06 » (prix et places masqués, privatiser coché et verrouillé, Publier depuis la liste sans prix) — admin local sur base de prod, 14/10 | 0ac0fb3, 84ce04f, ff98f8a | ok |
| CA-02 | même e2e : brouillon = créneau ouvert ; publié = bloqué avec « Privatisé : <titre> » ; dépublié / supprimé = rouvert | 84ce04f, ff98f8a | ok |
| CA-03 | `e2e-site/evenements-prives.e2e.ts` ×4 (mention + horaire sans prix ni bouton, absent de l'accueil, publics conservés si la vue échoue, ordre des heures) | 71045f8, d3e71d6, 2e6becd | ok |
| CA-04 | e2e admin : lecture anon réelle des 3 accès (table, vue tunnel, vue calendrier) avec un privé publié → titre jamais renvoyé, vue = `starts_at`/`ends_at` seulement ; écriture anon sur la vue refusée (401, correctif b3ed88c) | 06022cd, b3ed88c, 17b7227 | ok |
| CA-05 | `api.reservations.checkout.test.ts` « CA-05 (US-004) » (refus même avec un ancien prix) ; réservation manuelle : privé absent de la liste et refusé côté serveur | d19d16b, 17b7227 | ok |
| CA-06 | `agenda-labels.test.ts` ×2 ; e2e : badge « Privé » dans le Programme, case d'agenda « Privatisé : <titre> » | 84ce04f, 8b830a5, ff98f8a | ok |
| CA-07 | e2e « CA-07 » : avertissement « Cet événement a déjà 1 réservation(s)… » ; migration : empreinte des 3 événements existants identique avant/après | 06022cd, ff98f8a | ok |

Non-régression : vitest 129/129, e2e admin complet 33/33 puis 8/8 après correctifs, e2e site 18/18, tests unitaires site 13/13 ; base propre après chaque passage.

## Historique

- 2026-10-14 — v1 brouillon (mail de Tara du 10/10 + capture ; choix de Lyes du 14/10).
- 2026-10-14 — v1 révisée après relecture et décisions de Lyes (mention admin, libellé, réservations existantes).
- 2026-10-14 — v1 validée par Lyes (réponse « Validée », dans la conversation).
- 2026-10-14 — construite et vérifiée (local + base de prod). Migrations 20261014100000 et 20261014110000 appliquées en prod (accord de Lyes) ; site et admin pas encore déployés. Relecture de code : vue rendue en lecture seule (faille d'écriture anon, aucun privé n'existait), réservation manuelle refusée côté serveur, dé-privatisation au retour en public, tri par heure.
- 2026-10-14 — en production (site d3e71d6, admin 2b13e83). Contrôle prod : e2e admin 11/11 contre l'admin en ligne ; un privé [TEST] en 2099 affiché « Événement privé — la Maison est privatisée » au calendrier, sans titre, description, prix ni bouton, absent de l'accueil, 0 erreur console ; supprimé ensuite. En attente de l'acceptation de Lyes.
- 2026-10-14 — acceptée par Lyes (« oui j'accepte », dans la conversation).
- 2026-10-14 — livrée : en production depuis le 2026-10-14.
