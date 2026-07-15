# Tranche 2 — Brique de signature Monetico · Plan

> **Sub-skill :** subagent-driven-development. Steps en cases à cocher.

**Goal :** Bibliothèque TypeScript pure (aucun compte, aucun réseau) qui reproduit EXACTEMENT le
sceau (MAC) de Monetico Paiement : dérivation de clé, HMAC-SHA1 en iso-8859-1, chaîne phase 1
(ordre des champs), vérification phase 2 + accusé. Couverte par des tests contre des **vecteurs de
référence générés avec la logique du kit officiel** (le MAC TS doit égaler celui du kit Python).

**Architecture :** `app/src/lib/monetico/` — 3 modules (`signature`, `phase1`, `phase2`), uniquement
`node:crypto`. Aucune I/O. Réutilisé plus tard par les tunnels acompte + bon cadeau.

**Tech :** TypeScript strict, Vitest. Réf. mécanique : `docs/phase-2/2026-07-15-monetico-integration-notes.md`.

## Global Constraints
- TS strict, JAMAIS `any`. Alias `@/*`. Max ~200 lignes/fichier. Pas de secret commité.
- Montants en centimes. `pnpm typecheck` + `pnpm test:run` + `pnpm build` doivent passer.
- Encodage **iso-8859-1 (latin1)** pour le HMAC — PAS utf-8 (sinon MAC faux sur les accents).
- Tri des clés phase 2 : `.sort()` par défaut (ordre code-unit, = `sorted()` Python), **pas** `localeCompare`.

## Vecteurs de référence (générés via la logique du kit officiel — NE PAS modifier)

Clé de test (placeholder du kit) : `CLE = "12345678901234567890123456789012345678P0"`
- `getUsableKey(CLE)` → clé binaire = hex `1234567890123456789012345678901234567890` (20 octets)
- `computeMac(CLE, "hello")` = `a535d23382a5191994c64d2c629114739cd51bf9`
- `computeMac(CLE, "réservé")` = `5eed6ee7cf26cbf7e61ec9ee95049b251933ed32`  *(latin1 ; en utf-8 on aurait `fcfbf74d…` → un test qui échoue si l'encodage est faux)*
- Phase 1 (chaîne complète ci-dessous) `computeMac(CLE, p1)` = `46165c101c4b7cda3f79ca2e57852d36ebf569ec`
- Phase 2 (chaîne triée ci-dessous) `computeMac(CLE, p2)` = `aae928c2040d6686311881e98cd251554d24b811`

`p1` (ordre EXACT des champs, joints par `*`) :
```
TPE=1234567*contexte_commande=*date=13/07/2026:10:00:00*dateech1=*dateech2=*dateech3=*dateech4=*lgue=FR*mail=client@test.fr*montant=6.00EUR*montantech1=*montantech2=*montantech3=*montantech4=*nbrech=*reference=MDT0001*societe=maisondetara*texte-libre=resa:atelier:0001*url_retour_err=https://mdt.fr/paiement/erreur*url_retour_ok=https://mdt.fr/paiement/ok*version=3.0
```
`p2` (params hors `MAC`, clés triées, `k=v` joints par `*`) :
```
TPE=1234567*code-retour=paiement*date=13/07/2026_10:05:00*montant=6.00EUR*reference=MDT0001*texte-libre=resa:atelier:0001
```

---

### Task 1 : `signature.ts` (dérivation de clé + HMAC)

**Files :** Create `app/src/lib/monetico/signature.ts`, `app/src/lib/monetico/signature.test.ts`

**Interfaces (Produces) :**
- `getUsableKey(cle: string): Buffer`
- `computeMac(cle: string, data: string): string`  (hex minuscule)
- `verifyMac(cle: string, data: string, mac: string): boolean`

- [ ] **Step 1 — tests rouges** (`signature.test.ts`) :
```ts
import { describe, expect, test } from 'vitest'
import { getUsableKey, computeMac, verifyMac } from '@/lib/monetico/signature'

const CLE = '12345678901234567890123456789012345678P0'

test('getUsableKey applique la transformation du kit', () => {
  expect(getUsableKey(CLE).toString('hex')).toBe('1234567890123456789012345678901234567890')
})
test('computeMac ASCII == vecteur du kit', () => {
  expect(computeMac(CLE, 'hello')).toBe('a535d23382a5191994c64d2c629114739cd51bf9')
})
test('computeMac encode en iso-8859-1 (accents)', () => {
  expect(computeMac(CLE, 'réservé')).toBe('5eed6ee7cf26cbf7e61ec9ee95049b251933ed32')
})
test('verifyMac accepte le bon MAC (insensible à la casse) et refuse un mauvais', () => {
  const mac = computeMac(CLE, 'hello')
  expect(verifyMac(CLE, 'hello', mac.toUpperCase())).toBe(true)
  expect(verifyMac(CLE, 'hello', 'deadbeef')).toBe(false)
})
```
- [ ] **Step 2 — run rouge** : `cd app && pnpm test:run src/lib/monetico/signature.test.ts` → FAIL (module absent).
- [ ] **Step 3 — implémenter** `signature.ts` :
```ts
import { createHmac } from 'node:crypto'

export function getUsableKey(cle: string): Buffer {
  let hexStrKey = cle.slice(0, 38)
  const hexFinal = cle.slice(38, 40) + '00'
  const cca0 = hexFinal.charCodeAt(0)
  if (cca0 > 70 && cca0 < 97) {
    hexStrKey += String.fromCharCode(cca0 - 23) + hexFinal[1]
  } else if (hexFinal[1] === 'M') {
    hexStrKey += hexFinal[0] + '0'
  } else {
    hexStrKey += hexFinal.slice(0, 2)
  }
  return Buffer.from(hexStrKey, 'hex')
}

export function computeMac(cle: string, data: string): string {
  return createHmac('sha1', getUsableKey(cle)).update(Buffer.from(data, 'latin1')).digest('hex')
}

export function verifyMac(cle: string, data: string, mac: string): boolean {
  return computeMac(cle, data) === mac.toLowerCase()
}
```
- [ ] **Step 4 — run vert** : même commande → PASS (4 tests).
- [ ] **Step 5 — commit** : `git add app/src/lib/monetico/signature*.ts && git commit -m "feat(monetico): dérivation de clé + HMAC-SHA1 (sceau), vecteurs kit"`

---

### Task 2 : `phase1.ts` (chaîne + champs du formulaire de paiement)

**Files :** Create `app/src/lib/monetico/phase1.ts`, `phase1.test.ts`

**Interfaces :**
- `interface Phase1Input { tpe; date; montantCents; devise?; reference; mail; societe; lgue?; version?; urlRetourOk; urlRetourErr; texteLibre?; contexteCommande? }` (tous `string` sauf `montantCents: number`)
- `formatMontant(cents: number, devise?: string): string` → ex. `formatMontant(600)` = `"6.00EUR"`
- `buildMacString(input: Phase1Input): string`  (ordre EXACT des champs, cf. `p1`)
- `buildPaymentFields(cle: string, input: Phase1Input): Record<string, string>`  (champs du form, MAC inclus)

- [ ] **Step 1 — tests rouges** :
```ts
import { expect, test } from 'vitest'
import { formatMontant, buildMacString, buildPaymentFields } from '@/lib/monetico/phase1'
import { computeMac } from '@/lib/monetico/signature'

const CLE = '12345678901234567890123456789012345678P0'
const input = {
  tpe: '1234567', date: '13/07/2026:10:00:00', montantCents: 600, reference: 'MDT0001',
  mail: 'client@test.fr', societe: 'maisondetara', texteLibre: 'resa:atelier:0001',
  urlRetourOk: 'https://mdt.fr/paiement/ok', urlRetourErr: 'https://mdt.fr/paiement/erreur',
}

test('formatMontant colle la devise', () => {
  expect(formatMontant(600)).toBe('6.00EUR')
  expect(formatMontant(1250, 'EUR')).toBe('12.50EUR')
})
test('buildMacString respecte l’ordre exact du kit', () => {
  expect(buildMacString(input)).toBe(
    'TPE=1234567*contexte_commande=*date=13/07/2026:10:00:00*dateech1=*dateech2=*dateech3=*dateech4=*lgue=FR*mail=client@test.fr*montant=6.00EUR*montantech1=*montantech2=*montantech3=*montantech4=*nbrech=*reference=MDT0001*societe=maisondetara*texte-libre=resa:atelier:0001*url_retour_err=https://mdt.fr/paiement/erreur*url_retour_ok=https://mdt.fr/paiement/ok*version=3.0',
  )
})
test('buildMacString → MAC == vecteur du kit', () => {
  expect(computeMac(CLE, buildMacString(input))).toBe('46165c101c4b7cda3f79ca2e57852d36ebf569ec')
})
test('buildPaymentFields inclut un MAC cohérent et les champs du form', () => {
  const f = buildPaymentFields(CLE, input)
  expect(f.MAC).toBe('46165c101c4b7cda3f79ca2e57852d36ebf569ec')
  expect(f.TPE).toBe('1234567')
  expect(f.montant).toBe('6.00EUR')
  expect(f.version).toBe('3.0')
})
```
- [ ] **Step 2 — run rouge**. **Step 3 — implémenter** (`lgue` défaut `'FR'`, `version` défaut `'3.0'`, `devise` défaut `'EUR'`, `contexteCommande`/`texteLibre` défaut `''` ; `formatMontant` = `(cents/100).toFixed(2) + devise` ; `buildMacString` concatène les 21 champs dans l'ordre du kit ; `buildPaymentFields` = les champs du form (version, TPE, contexte_commande, date, montant, reference, MAC, url_retour_ok, url_retour_err, lgue, societe, texte-libre, mail) avec `MAC = computeMac(cle, buildMacString(input))`). **Step 4 — run vert**. **Step 5 — commit** `feat(monetico): phase 1 (chaîne + champs form)`.

---

### Task 3 : `phase2.ts` (vérification du retour + accusé)

**Files :** Create `app/src/lib/monetico/phase2.ts`, `phase2.test.ts`

**Interfaces :**
- `buildReturnMacString(params: Record<string, string>): string`  (exclut `MAC`, trie les clés via `.sort()` par défaut, joint `k=v` par `*`)
- `verifyReturn(cle: string, params: Record<string, string>, mac: string): boolean`
- `ackResponse(ok: boolean): string`  → `"version=2\ncdr=0"` si `ok`, sinon `"version=2\ncdr=1"`

- [ ] **Step 1 — tests rouges** :
```ts
import { expect, test } from 'vitest'
import { buildReturnMacString, verifyReturn, ackResponse } from '@/lib/monetico/phase2'

const CLE = '12345678901234567890123456789012345678P0'
const params = {
  TPE: '1234567', date: '13/07/2026_10:05:00', montant: '6.00EUR', reference: 'MDT0001',
  'code-retour': 'paiement', 'texte-libre': 'resa:atelier:0001',
}

test('buildReturnMacString trie les clés et exclut MAC', () => {
  expect(buildReturnMacString({ ...params, MAC: 'ignore' })).toBe(
    'TPE=1234567*code-retour=paiement*date=13/07/2026_10:05:00*montant=6.00EUR*reference=MDT0001*texte-libre=resa:atelier:0001',
  )
})
test('verifyReturn valide avec le MAC du kit', () => {
  const mac = 'aae928c2040d6686311881e98cd251554d24b811'
  expect(verifyReturn(CLE, params, mac)).toBe(true)
  expect(verifyReturn(CLE, params, 'deadbeef')).toBe(false)
})
test('ackResponse renvoie l’accusé exact', () => {
  expect(ackResponse(true)).toBe('version=2\ncdr=0')
  expect(ackResponse(false)).toBe('version=2\ncdr=1')
})
```
- [ ] **Step 2 — run rouge**. **Step 3 — implémenter** (`buildReturnMacString` : `Object.keys(params).filter(k => k !== 'MAC').sort().map(k => \`${k}=${params[k]}\`).join('*')` ; `verifyReturn` = `verifyMac(cle, buildReturnMacString(params), mac)` en important depuis `@/lib/monetico/signature` ; `ackResponse`). **Step 4 — run vert**. **Step 5 — commit** `feat(monetico): phase 2 (vérif retour + accusé)`.

## Recette
- [ ] Les 3 suites passent (vecteurs kit reproduits en TS).
- [ ] `pnpm typecheck` + `pnpm build` verts. Aucun `any`. Aucun secret.
