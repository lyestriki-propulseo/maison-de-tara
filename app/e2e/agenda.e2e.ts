import { expect, test } from '@playwright/test'
import { cleanupTestData, pickTestSlot, readSlot, restoreSlot, testDb } from './support/db'
import { openSlot } from './support/agenda'
import { TEST_PREFIX, testEmail } from './support/env'
import type { Slot } from './support/db'

// Agenda : capacité, blocage et réservation manuelle sur UN créneau lointain, remis en l'état.
// Non testé en prod (irréversible) : « Enregistrer et générer » la grille, « Bloquer le jour ».
test.describe.configure({ mode: 'serial' })

let slot: Slot

test.beforeAll(async () => {
  slot = await pickTestSlot()
})

test.afterAll(async () => {
  await cleanupTestData()
  await restoreSlot(slot)
})

test('modifier la capacité d’un créneau puis la remettre', async ({ page }) => {
  await openSlot(page, slot)
  const capacity = page.getByLabel('Capacité de ce créneau')

  await capacity.fill(String(slot.capacity - 1))
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Capacité mise à jour.')
  expect((await readSlot(slot.id)).capacity).toBe(slot.capacity - 1)

  await capacity.fill(String(slot.capacity))
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Capacité mise à jour.')
  expect((await readSlot(slot.id)).capacity).toBe(slot.capacity)
})

test('bloquer un créneau puis le rouvrir', async ({ page }) => {
  await openSlot(page, slot)

  await page.getByRole('button', { name: 'Bloquer', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Créneau bloqué.')
  expect((await readSlot(slot.id)).status).toBe('blocked')

  await page.getByRole('button', { name: 'Rouvrir', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Créneau rouvert.')
  expect((await readSlot(slot.id)).status).toBe('open')
})

test('ajouter une réservation manuelle sur un créneau', async ({ page }) => {
  const email = testEmail()
  await openSlot(page, slot)

  await page.getByLabel('Nom', { exact: true }).fill(`${TEST_PREFIX} Agenda`)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Personnes').fill('1')
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click()
  await expect(page.getByRole('status')).toContainText('Réservation manuelle ajoutée.')

  const { data } = await testDb()
    .from('reservations')
    .select('status, source, party_size, session_instance_id')
    .eq('customer_email', email)
    .single()
  expect(data).toEqual({ status: 'confirmed', source: 'manual', party_size: 1, session_instance_id: slot.id })
})
