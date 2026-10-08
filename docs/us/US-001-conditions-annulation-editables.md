---
id: US-001
titre: Tara modifie elle-même les conditions d'annulation affichées au moment de réserver
statut: brouillon
version: 1
projet: Maison de Tara (site + admin)
---

# US-001 — Tara modifie elle-même les conditions d'annulation affichées au moment de réserver

## L'histoire

**En tant que** Tara, gérante de la Maison de Tara, connectée à l'admin,
**je veux** écrire moi-même le texte des conditions d'annulation qui s'affiche sous le paiement dans le
formulaire de réservation, avec un texte pour les ateliers et un autre pour les événements,
**afin de** annoncer ma vraie règle (pas de remboursement, report possible) sans dépendre de Propulseo.

**Exemple concret** : le jeudi 8 octobre, Tara ouvre l'admin, va dans Contenu, choisit la page Atelier
et remplace le texte « Conditions d'annulation — atelier libre » par « Modification de la date ou de
l'horaire possible jusqu'à 48 h avant votre créneau. Passé ce délai, l'acompte reste acquis. »
Elle enregistre. Un client qui ouvre la page Atelier et choisit « Atelier libre » lit cette phrase sous
le texte de l'acompte. S'il choisit « Événement », il lit à la place le texte prévu pour les événements.

## Limites (ce que l'US ne fait PAS)

- Ne change pas la règle réelle (aucun remboursement automatique ou en libre-service n'existe ; rien à
  modifier côté paiement Stripe).
- Ne rédige pas le texte final à la place de Tara : on reprend le texte actuel, c'est elle qui l'écrit.
- Pas de mise en forme (gras, liens) dans ces textes : texte brut, comme le reste de l'écran Contenu.
- Ne touche pas aux emails de confirmation (ils ne parlent pas d'annulation).

## Critères d'acceptation

- **CA-01** — Étant donné Tara connectée, quand elle ouvre Contenu › Atelier, alors elle voit deux
  champs « Conditions d'annulation — atelier libre » et « Conditions d'annulation — événement »,
  préremplis avec le texte actuellement affiché sur le site.
- **CA-02** — Étant donné le champ « atelier libre » modifié et enregistré, quand un visiteur ouvre (ou
  recharge) la page Atelier en mode « Atelier libre », alors il lit le nouveau texte sous la mention de
  l'acompte, et pas l'ancien.
- **CA-03** — Étant donné le formulaire de réservation, quand le visiteur bascule entre « Atelier libre »
  et « Événement », alors seul le texte du mode choisi est visible (même comportement que la mention
  d'acompte).
- **CA-04** — Étant donné un champ vidé et enregistré par Tara, quand le visiteur affiche le mode
  correspondant, alors aucune ligne de conditions n'apparaît (l'ancien texte « remboursé » ne revient pas).
- **CA-05** — Étant donné la base de production, quand on ajoute les deux nouveaux champs, alors aucun
  texte ou photo déjà modifié par Tara dans Contenu n'est écrasé.
- **CA-06** — Étant donné Supabase injoignable, quand le visiteur ouvre la page Atelier, alors le texte
  statique du HTML s'affiche (repli actuel du site conservé).

## Faits et hypothèses

- **Fait** (`wandau-mdt/_src/atelier.html:180`) : le texte est codé en dur dans
  `<p class="refund-policy">`, sans `data-mdt-content`, et s'affiche dans les deux modes.
- **Fait** (`atelier.html:174-179`, `js/site-booking.js:33-34,164`) : la mention d'acompte existe déjà en
  deux versions (`#rf-acompte-atelier` / `#rf-acompte-evenement`), basculées par `toggleMode()`.
- **Fait** (`js/site-content.js:87-100`) : un champ vide en base laisse le HTML statique affiché ; le
  mécanisme `data-mdt-hide-if-empty` (l. 134-139) retire un élément dont le champ témoin est vide.
- **Fait** (mail de Tara du 08/10/2026) : « Je ne veux pas d'annulation, je ne veux pas rentrer dans
  l'histoire de remboursements […] modification des dates/horaires possible jusqu'à 48 h avant votre
  créneau, passé ce délai… » (phrase inachevée).
- **Fait** (`supabase/migrations/20260828100000_content_blocks_global_coords.sql`) : précédent d'ajout de
  champs de contenu par migration `insert`.
- **Hypothèse** : les deux champs vont dans la page `atelier` de `content_blocks`, clés
  `atelier.reserve.conditions` et `atelier.reserve.conditions_evenement`, ajoutés par une migration
  `insert … on conflict (page, field_key) do nothing` (garantit CA-05 ; pas de réexécution du script de
  seed atelier, qui ferait un upsert écrasant).
- **Hypothèse** : le texte initial du champ « événement » reprend le texte actuel ; Tara l'adaptera.

## Questions ouvertes

Aucune côté construction. À demander à Tara, pour l'aider à rédiger son texte (hors US) : que se
passe-t-il « passé ce délai » (acompte perdu ?), et quelle règle pour un événement payé en entier ?

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

## Historique

- 2026-10-08 — v1 brouillon (demande de Tara par mail du 08/10 ; choix de Lyes : deux textes, un par mode).
