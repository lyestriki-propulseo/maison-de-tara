import { expect, test } from 'vitest'
import { formatMontant, buildMacString, buildPaymentFields } from '@/lib/monetico/phase1'
import { computeMac } from '@/lib/monetico/signature'

const CLE = '12345678901234567890123456789012345678P0'
const input = {
  tpe: '1234567',
  date: '13/07/2026:10:00:00',
  montantCents: 600,
  reference: 'MDT0001',
  mail: 'client@test.fr',
  societe: 'maisondetara',
  texteLibre: 'resa:atelier:0001',
  urlRetourOk: 'https://mdt.fr/paiement/ok',
  urlRetourErr: 'https://mdt.fr/paiement/erreur',
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
