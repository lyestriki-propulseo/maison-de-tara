import { expect, test } from 'vitest'
import { buildReturnMacString, verifyReturn, ackResponse } from '@/lib/monetico/phase2'

const CLE = '12345678901234567890123456789012345678P0'
const params = {
  TPE: '1234567',
  date: '13/07/2026_10:05:00',
  montant: '6.00EUR',
  reference: 'MDT0001',
  'code-retour': 'paiement',
  'texte-libre': 'resa:atelier:0001',
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
