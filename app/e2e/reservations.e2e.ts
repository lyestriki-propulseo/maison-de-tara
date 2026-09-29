import { expect, test } from '@playwright/test'
import { cleanupTestData, pickTestSlot, testDb } from './support/db'
import { TEST_PREFIX, testEmail } from './support/env'

// Réservations : création manuelle depuis la liste, puis changement de statut (sur la réservation
// de test uniquement : sur une vraie, ça libère une place sans rembourser).
test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await cleanupTestData()
})

test('créer une réservation manuelle puis l’annuler', async ({ page }) => {
  const slot = await pickTestSlot()
  const email = testEmail()
  const name = `${TEST_PREFIX} Liste`

  await page.goto('/admin/reservations')
  await page.getByRole('button', { name: 'Nouvelle réservation' }).click()
  // Le libellé englobe aussi les options : on cible le menu qui liste les créneaux d'atelier.
  const slotSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Atelier libre ·' }) })
  await slotSelect.selectOption({
    label: `Atelier libre · ${slot.session_date} ${slot.start_time.slice(0, 5)}`,
  })
  await page.getByLabel('Nom du client').fill(name)
  await page.getByLabel('Nombre de personnes').fill('1')
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('Réservation ajoutée.')

  const row = page.getByRole('listitem').filter({ hasText: name })
  await expect(row).toBeVisible()
  await row.getByRole('combobox').selectOption({ label: 'Annulée' })
  await expect(page.getByRole('status')).toContainText('Statut mis à jour.')

  const { data } = await testDb().from('reservations').select('status').eq('customer_email', email).single()
  expect(data?.status).toBe('cancelled')
})
