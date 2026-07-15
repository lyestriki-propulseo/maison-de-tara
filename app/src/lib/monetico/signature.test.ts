import { expect, test } from 'vitest'
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
