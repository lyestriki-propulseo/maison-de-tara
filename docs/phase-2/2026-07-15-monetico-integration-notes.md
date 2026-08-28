# Monetico Paiement — notes d'intégration

**Date :** 2026-07-15
**Produit confirmé :** **Monetico Paiement** (Monetico Online) — mono-marchand, page hébergée.
**Source :** kit officiel Python d'Euro-Information (v4.0, 2014), fourni dans `kit-python.zip`.
**Cadre :** back-office de Tara — voir [`2026-07-15-cadrage-admin-tara.md`](2026-07-15-cadrage-admin-tara.md).

> On réimplémentera cette logique en **Node/TypeScript** (notre stack) ; le kit Python
> sert uniquement de référence. Rien de sorcier : un form POST signé + un webhook signé.

---

## Principe en 2 phases

```
                    (1) form POST signé (MAC)
  Navigateur  ────────────────────────────────►  Page hébergée Monetico
   client                                          (saisie carte + 3DS)
      ▲                                                   │
      │  (3) redirection url_retour_ok / _err             │
      │      = juste l'affichage merci/erreur             │
      └───────────────────────────────────────────────────┘
                                                          │
      (2) POST serveur→serveur vers NOTRE webhook  ◄──────┘
          = SOURCE DE VÉRITÉ du paiement
          on vérifie le MAC, on confirme, on répond "version=2\ncdr=0"
```

⚠️ **La confirmation fiable, c'est la phase 2 (webhook serveur→serveur), PAS le retour
navigateur.** Le client peut fermer son onglet : on doit quand même confirmer via le webhook.

---

## Paramètres (config)

| Param | Rôle | Exemple kit (placeholder) |
|---|---|---|
| `MONETICOPAIEMENT_EPTNUMBER` | Numéro de TPE virtuel | `0000001` |
| `MONETICOPAIEMENT_KEY` | **Clé de sécurité HMAC (40 car.)** — SECRET | `...P0` |
| `MONETICOPAIEMENT_VERSION` | Version protocole | `3.0` |
| `MONETICOPAIEMENT_COMPANYCODE` | Code société (`societe`) | `Maison de Tara` |
| `MONETICOPAIEMENT_URLSERVER` | Base URL | test : `https://p.monetico-services.com/test/` · prod : `https://p.monetico-services.com/` |
| `MONETICOPAIEMENT_URLPAYMENT` | Endpoint | `paiement.cgi` |
| `url_retour_ok` / `url_retour_err` | Retours navigateur | (nos pages merci/erreur) |

🔑 **La clé, le TPE et le code société sont des SECRETS** → variables d'env (`.env` gitignoré),
jamais dans le code ni le repo. Les valeurs du kit sont des placeholders : **les vrais
identifiants (test + prod) viennent du contrat Monetico Online de Tara** — encore à récupérer.

---

## Phase 1 — demande de paiement

1. Construire la **chaîne à signer**, champs joints par `*`, dans **cet ordre précis** :
   `TPE`, `contexte_commande`, `date`, `dateech1..4`, `lgue`, `mail`, `montant`,
   `montantech1..4`, `nbrech`, `reference`, `societe`, `texte-libre`,
   `url_retour_err`, `url_retour_ok`, `version`.
2. `MAC = HMAC_SHA1(cléUtilisable, chaîne)` en **hexdigest minuscule**, chaîne encodée **iso-8859-1**.
3. Rendre un **form POST auto-submit** vers `URLSERVER + paiement.cgi` avec les champs
   cachés (version, TPE, contexte_commande, date, montant, reference, MAC, url_retour_ok,
   url_retour_err, lgue, societe, texte-libre, mail).

**Formats stricts :**
- `reference` : unique, **alphanumérique, ≤ 12 caractères**.
- `montant` : `"xxxxx.yy"` + devise ISO **collée** → ex. `"6.00EUR"`.
- `date` : `dd/mm/yyyy:hh:mm:ss`.
- `texte-libre` : texte libre — **on y met notre identifiant interne** (type + id de résa /
  bon cadeau) pour retrouver la commande au retour.
- `contexte_commande` : JSON (billing/shipping/client) **UTF-8 → base64** (pour le 3DS).
- Paiement fractionné (`nbrech`, `dateechN`, `montantechN`) : **inutilisé** au lancement (vide).

## Clé « utilisable » (transformation à porter en Node)

La clé 40 caractères n'est pas utilisée telle quelle. Algo du kit (`_getUsableKey`) :
- `hexStrKey = clé[0:38]`
- `hexFinal = clé[38:40] + "00"`
- soit `c = ord(hexFinal[0])` : si `70 < c < 97` → `hexStrKey += chr(c-23) + hexFinal[1]` ;
  sinon si `hexFinal[1] == "M"` → `hexStrKey += hexFinal[0] + "0"` ; sinon `hexStrKey += hexFinal[0:2]`.
- puis **hex-decode** de `hexStrKey` → clé binaire utilisée pour le HMAC.
→ À réécrire fidèlement en TS (sinon les MAC ne matcheront jamais).

## Phase 2 — retour / notification (webhook)

Monetico fait un **POST serveur→serveur** vers notre URL de notification :
1. Récupérer tous les params POST **sauf `MAC`**.
2. **Trier par clé (ordre alpha)**, joindre en `clé=valeur` séparés par `*`.
3. Vérifier `HMAC_SHA1(chaîne) == MAC` (minuscule).
4. Lire `code-retour` :
   - `paiement` → **payé (prod)** · `payetest` → **payé (serveur de test)**
   - `Annulation` → **refusé**
   - `paiement_pfN` / `Annulation_pfN` → échéances fractionnées (non utilisé)
5. **Répondre exactement** `version=2\ncdr=0` si OK (`cdr=1` si MAC invalide).
   Sans cet accusé, **la banque retente** l'appel.

**Idempotence** : la banque peut appeler plusieurs fois → traiter le même `reference`
plusieurs fois sans double-effet (ne pas ré-émettre le bon cadeau / re-confirmer deux fois).

---

## Mapping sur nos 2 flux

Même mécanique pour les deux ; on distingue via `reference` + `texte-libre` :

- **Acompte de réservation** : phase 2 `paiement`/`payetest` → marquer la **résa confirmée**
  + déclencher l'email de confirmation. `Annulation` → libérer le créneau.
- **Bon cadeau** : phase 2 `paiement`/`payetest` → **générer le code + PDF** et l'envoyer par
  email à l'acheteur, l'enregistrer dans l'admin (statut/solde).

## À faire côté Node/TS (au plan)

- Porter `_getUsableKey` + `HMAC-SHA1` (encodage iso-8859-1) — **couvrir de tests unitaires**
  avec une chaîne connue avant tout appel réel.
- **Phase 1** : server function → form auto-submit (ou 307 vers la page hébergée).
- **Phase 2** : route POST publique (webhook), réponse ACK exacte, idempotente, journalisée.
- Pages navigateur `url_retour_ok` / `url_retour_err` (merci / erreur) — sans logique métier.
- **Récupérer les vrais identifiants** (test puis prod) du contrat Monetico Online de Tara.
