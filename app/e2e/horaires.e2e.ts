import { expect, test } from '@playwright/test'
import { testDb } from './support/db'

// Horaires d'ouverture (validation + enregistrement) et acompte de l'atelier, remis à l'identique.
test.describe.configure({ mode: 'serial' })

type Setting = { key: string; value: unknown } | null
let hours: Setting
let deposit: Setting

async function readSetting(key: string): Promise<Setting> {
  const { data, error } = await testDb().from('site_settings').select('key, value').eq('key', key).maybeSingle()
  if (error) throw error
  return data
}

async function restoreSetting(key: string, original: Setting) {
  const db = testDb()
  if (original) await db.from('site_settings').upsert({ key, value: original.value as never }, { onConflict: 'key' })
  else await db.from('site_settings').delete().eq('key', key)
}

test.beforeAll(async () => {
  hours = await readSetting('hours')
  deposit = await readSetting('atelier_deposit')
})

test.afterAll(async () => {
  await restoreSetting('hours', hours)
  await restoreSetting('atelier_deposit', deposit)
})

test('refuse une plage dont la fin est avant le début, sans rien enregistrer', async ({ page }) => {
  await page.goto('/admin/horaires')
  const opening = page.getByLabel(/^Ouverture /).first()
  const label = await opening.getAttribute('aria-label')
  const day = label?.replace('Ouverture ', '') ?? ''
  await opening.fill('18:00')
  await page.getByLabel(`Fermeture ${day}`).first().fill('10:00')
  await page.getByRole('button', { name: 'Enregistrer les horaires' }).click()
  await expect(page.getByRole('alert')).toContainText('La fin doit être après le début')
  expect(await readSetting('hours')).toEqual(hours)
})

test('enregistrer les horaires puis remettre les originaux', async ({ page }) => {
  await page.goto('/admin/horaires')
  const closing = page.getByLabel(/^Fermeture /).first()
  const original = await closing.inputValue()

  await closing.fill('17:45')
  await page.getByRole('button', { name: 'Enregistrer les horaires' }).click()
  await expect(page.getByRole('status')).toContainText('Horaires enregistrés.')
  expect(JSON.stringify((await readSetting('hours'))?.value)).toContain('17:45')

  await closing.fill(original)
  await page.getByRole('button', { name: 'Enregistrer les horaires' }).click()
  await expect(page.getByRole('status')).toContainText('Horaires enregistrés.')
})

test('régler l’acompte de l’atelier puis le remettre', async ({ page }) => {
  await page.goto('/admin/horaires')
  const field = page.getByLabel('Acompte par personne (€)')
  const original = await field.inputValue()

  await field.fill('7')
  await page.getByRole('button', { name: 'Enregistrer l’acompte' }).click()
  await expect(page.getByRole('status')).toContainText('Acompte enregistré.')
  expect((await readSetting('atelier_deposit'))?.value).toEqual({ cents: 700 })

  await field.fill('-3')
  await page.getByRole('button', { name: 'Enregistrer l’acompte' }).click()
  await expect(page.getByRole('alert')).toContainText('Montant invalide')

  await field.fill(original)
  await page.getByRole('button', { name: 'Enregistrer l’acompte' }).click()
  await expect(page.getByRole('status')).toContainText('Acompte')
})
