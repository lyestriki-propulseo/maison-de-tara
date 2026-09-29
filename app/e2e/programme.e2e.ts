import { expect, test } from '@playwright/test'
import { cleanupTestData, pickTestSlot, readSlot, restoreSlot } from './support/db'
import { TEST_PREFIX } from './support/env'
import type { Page } from '@playwright/test'
import type { Slot } from './support/db'

// Programme : brouillon (jamais publié), validations, puis privatisation sur un vrai créneau
// (l'événement [TEST] n'est publié que quelques secondes, 1 place, avec acompte).
test.describe.configure({ mode: 'serial' })

let slot: Slot

test.beforeAll(async () => {
  slot = await pickTestSlot()
})

test.afterAll(async () => {
  await cleanupTestData()
  await restoreSlot(slot)
})

async function openNewEvent(page: Page, title: string) {
  await page.goto('/admin/programme')
  await page.getByRole('button', { name: 'Nouvel événement' }).click()
  await page.getByLabel('Titre').fill(title)
}

function eventRow(page: Page, title: string) {
  return page.getByRole('listitem').filter({ hasText: title })
}

test('créer un brouillon, le modifier puis le supprimer', async ({ page }) => {
  const title = `${TEST_PREFIX} Brouillon ${Date.now()}`
  await openNewEvent(page, title)
  await page.getByLabel('Date et heure').fill('2027-12-31T10:00')
  await page.getByLabel('Places').fill('3')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement créé.')
  await expect(eventRow(page, title)).toContainText('Brouillon')

  await eventRow(page, title).getByRole('button', { name: 'Modifier' }).click()
  await page.getByLabel('Places').fill('4')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement mis à jour.')
  await expect(eventRow(page, title)).toContainText('4 places')

  page.once('dialog', (dialog) => void dialog.accept())
  await eventRow(page, title).getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement supprimé.')
  await expect(eventRow(page, title)).toHaveCount(0)
})

test('refuse de privatiser sans heure de fin', async ({ page }) => {
  await openNewEvent(page, `${TEST_PREFIX} Sans fin`)
  await page.getByLabel('Date et heure').fill('2027-12-31T19:00')
  await page.getByLabel(/Privatiser la salle/).check()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('alert')).toContainText('Indiquez l’heure de fin pour privatiser la salle')
})

test('une soirée qui privatise bloque puis rouvre le créneau d’atelier', async ({ page }) => {
  const title = `${TEST_PREFIX} Privatisation ${Date.now()}`
  const start = `${slot.session_date}T${slot.start_time.slice(0, 5)}`
  const endHour = Number(slot.start_time.slice(0, 2)) + 1
  const end = `${slot.session_date}T${String(endHour).padStart(2, '0')}:${slot.start_time.slice(3, 5)}`

  await openNewEvent(page, title)
  await page.getByLabel('Type').selectOption({ label: 'Soirée' })
  await page.getByLabel('Places').fill('1')
  await page.getByLabel('Date et heure').fill(start)
  await page.getByLabel(/^Fin/).fill(end)
  await page.getByLabel(/Privatiser la salle/).check()
  await page.getByLabel('Publié sur le site').check()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('1 créneau(x) d’atelier bloqué(s)')

  const blocked = await readSlot(slot.id)
  expect(blocked.status).toBe('blocked')
  expect(blocked.note).toBe(`Privatisé : ${title}`)

  // Dépublier garde la privatisation cochée mais rouvre le créneau.
  await eventRow(page, title).getByRole('button', { name: 'Dépublier' }).click()
  await expect(page.getByRole('status')).toContainText('Événement dépublié.')
  await expect(page.getByRole('status')).toContainText('rouvert')
  const reopened = await readSlot(slot.id)
  expect(reopened.status).toBe('open')
  expect(reopened.blocked_by_event_id).toBeNull()

  // Republier re-bloque (la case « privatiser » n'a pas été perdue en route).
  await eventRow(page, title).getByRole('button', { name: 'Publier' }).click()
  await expect(page.getByRole('status')).toContainText('bloqué')
  expect((await readSlot(slot.id)).status).toBe('blocked')

  // Supprimer rouvre aussi.
  page.once('dialog', (dialog) => void dialog.accept())
  await eventRow(page, title).getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement supprimé.')
  expect((await readSlot(slot.id)).status).toBe('open')
})

test('une session expirée pendant la veille ne bloque plus les actions', async ({ page }) => {
  // Reproduit le bug « Non authentifié. » (28/09) : jeton expiré dans le navigateur.
  await page.goto('/admin/programme')
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!key) throw new Error('Session Supabase introuvable')
    const session = JSON.parse(localStorage.getItem(key) ?? '{}') as { expires_at?: number }
    session.expires_at = Math.floor(Date.now() / 1000) - 60
    localStorage.setItem(key, JSON.stringify(session))
  })
  await page.reload()
  await openNewEvent(page, `${TEST_PREFIX} Session ${Date.now()}`)
  await page.getByLabel('Date et heure').fill('2027-12-30T10:00')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement créé.')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
