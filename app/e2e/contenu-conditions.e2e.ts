import { expect, test } from '@playwright/test'
import { testDb } from './support/db'

// US-001 CA-01 — lecture seule : les trois champs de la réservation (migration
// 20261008120000_content_reserve_conditions.sql) apparaissent dans Contenu › Atelier, à la fin du
// groupe « Réservation », dans l'ordre, et chaque champ affiche la valeur enregistrée en base.

const CHAMPS = [
  {
    key: 'atelier.reserve.conditions',
    label: /Conditions d.annulation — atelier libre \(laisser vide/,
  },
  {
    key: 'atelier.reserve.conditions_evenement',
    label: /Conditions d.annulation — événement \(laisser vide/,
  },
  { key: 'atelier.reserve.acompte_evenement', label: /^Paiement — événement/ },
]

test('CA-01 — Contenu › Atelier › Réservation : les 3 champs, dans l’ordre, avec leur valeur en base', async ({
  page,
}) => {
  const { data, error } = await testDb()
    .from('content_blocks')
    .select('field_key, text_value')
    .eq('page', 'atelier')
    .in(
      'field_key',
      CHAMPS.map((c) => c.key),
    )
  if (error) throw error
  const enBase = new Map(data.map((r) => [r.field_key, r.text_value ?? '']))
  expect(enBase.size).toBe(CHAMPS.length)

  await page.goto('/admin/contenu')
  await page.getByRole('button', { name: 'Atelier', exact: true }).click()
  const groupe = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Réservation' }) })
  const labels = groupe.locator('label')
  const total = await labels.count()

  for (const [i, champ] of CHAMPS.entries()) {
    const label = labels.nth(total - CHAMPS.length + i)
    await expect(label).toContainText(champ.label)
    await expect(label.locator('textarea')).toHaveValue(enBase.get(champ.key) ?? '')
  }
})
