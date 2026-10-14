import { expect, test } from '@playwright/test'
import {
  cleanupTestData,
  pickTestSlot,
  readSlot,
  restoreSlot,
  slotAriaPrefix,
  testDb,
} from './support/db'
import { TEST_PREFIX, e2eEnv, testEmail } from './support/env'
import type { Page } from '@playwright/test'
import type { Slot } from './support/db'

// US-004 — événement privé (docs/us/US-004-evenement-prive.md), contre la base de prod : les
// événements [TEST] ne restent publiés que quelques secondes et sont supprimés à la fin.
test.describe.configure({ mode: 'serial' })

let slot: Slot

test.beforeAll(async () => {
  slot = await pickTestSlot()
})

test.afterAll(async () => {
  await cleanupTestData()
  await restoreSlot(slot)
})

function eventRow(page: Page, title: string) {
  return page.getByRole('listitem').filter({ hasText: title })
}

async function anon(path: string): Promise<unknown[]> {
  const res = await fetch(`${e2eEnv.supabaseUrl()}/rest/v1/${path}`, {
    headers: { apikey: e2eEnv.anonKey(), Authorization: `Bearer ${e2eEnv.anonKey()}` },
  })
  expect(res.ok).toBe(true)
  return (await res.json()) as unknown[]
}

test('CA-01/02/04/06 — un privé sans prix se publie, privatise la salle et reste caché au public', async ({
  page,
}) => {
  const title = `${TEST_PREFIX} Privé ${Date.now()}`
  const start = `${slot.session_date}T${slot.start_time.slice(0, 5)}`
  const endHour = Number(slot.start_time.slice(0, 2)) + 1
  const end = `${slot.session_date}T${String(endHour).padStart(2, '0')}:${slot.start_time.slice(3, 5)}`

  await page.goto('/admin/programme')
  await page.getByRole('button', { name: 'Nouvel événement' }).click()
  await page.getByLabel('Titre').fill(title)
  await page.getByLabel(/Événement privé/).check()
  // CA-01 : ni prix ni places ; la salle est toujours privatisée.
  await expect(page.getByLabel(/Prix par personne/)).toBeHidden()
  await expect(page.getByLabel('Places')).toBeHidden()
  await expect(page.getByLabel(/Privatiser la salle/)).toBeChecked()
  await expect(page.getByLabel(/Privatiser la salle/)).toBeDisabled()
  await page.getByLabel('Date et heure').fill(start)
  await page.getByLabel(/^Fin/).fill(end)
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement créé.')
  // CA-02 : en brouillon, rien n'est bloqué.
  expect((await readSlot(slot.id)).status).toBe('open')

  const { data: row } = await testDb()
    .from('events')
    .select('is_private, privatise, deposit_enabled, deposit_amount_cents')
    .eq('title', title)
    .single()
  expect(row).toEqual({
    is_private: true,
    privatise: true,
    deposit_enabled: false,
    deposit_amount_cents: null,
  })

  // CA-06 : badge « Privé » dans la liste ; CA-01 : le bouton Publier fonctionne sans prix.
  await expect(eventRow(page, title)).toContainText('Privé')
  await expect(eventRow(page, title)).toContainText('Sur invitation')
  await eventRow(page, title).getByRole('button', { name: 'Publier', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('bloqué')
  const blocked = await readSlot(slot.id)
  expect(blocked.status).toBe('blocked')
  expect(blocked.note).toBe(`Privatisé : ${title}`)

  // CA-04 : un visiteur (clé anon) ne lit jamais le titre ; il n'a que les heures.
  expect(await anon(`events?select=title&title=eq.${encodeURIComponent(title)}`)).toEqual([])
  const fromTunnel = (await anon('public_availability_events?select=title')) as { title: string }[]
  expect(fromTunnel.map((e) => e.title)).not.toContain(title)
  const fromCalendar = (await anon('public_private_events?select=*')) as Record<string, unknown>[]
  expect(fromCalendar.length).toBeGreaterThan(0)
  for (const r of fromCalendar) expect(Object.keys(r).sort()).toEqual(['ends_at', 'starts_at'])

  // CA-04 : la vue publique est en lecture seule (correctif du 14/10) : ni modification ni
  // suppression possibles avec la clé du site.
  for (const method of ['PATCH', 'DELETE'] as const) {
    const res = await fetch(
      `${e2eEnv.supabaseUrl()}/rest/v1/public_private_events?starts_at=gte.2000-01-01`,
      {
        method,
        headers: {
          apikey: e2eEnv.anonKey(),
          Authorization: `Bearer ${e2eEnv.anonKey()}`,
          'Content-Type': 'application/json',
        },
        body: method === 'PATCH' ? JSON.stringify({ ends_at: '2000-01-01T00:00:00Z' }) : undefined,
      },
    )
    expect(res.ok).toBe(false)
  }
  expect((await readSlot(slot.id)).status).toBe('blocked')

  // CA-06 : l'agenda dit pourquoi le créneau est fermé.
  await page.goto('/admin/agenda')
  const cell = page.getByRole('button', { name: new RegExp(`^${slotAriaPrefix(slot)},`) })
  for (let week = 0; week < 20 && !(await cell.isVisible()); week += 1) {
    await page.getByRole('button', { name: 'Semaine suivante' }).click()
  }
  await expect(cell).toContainText(`Privatisé : ${title}`)

  // CA-02 : dépublier rouvre ; supprimer laisse ouvert.
  await page.goto('/admin/programme')
  await eventRow(page, title).getByRole('button', { name: 'Dépublier', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Événement dépublié.')
  expect((await readSlot(slot.id)).status).toBe('open')
  page.once('dialog', (dialog) => void dialog.accept())
  await eventRow(page, title).getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('status')).toContainText('Événement supprimé.')
  expect((await readSlot(slot.id)).status).toBe('open')
})

test('CA-07 — passer en privé un événement qui a des réservations affiche un avertissement', async ({
  page,
}) => {
  const title = `${TEST_PREFIX} Avec résa ${Date.now()}`
  const db = testDb()
  const { data: event, error } = await db
    .from('events')
    .insert({
      title,
      slug: `test-avec-resa-${Date.now()}`,
      event_type: 'soiree',
      starts_at: '2027-12-30T18:00:00Z',
      ends_at: '2027-12-30T20:00:00Z',
      capacity: 10,
      deposit_enabled: true,
      deposit_amount_cents: 4000,
      published: false,
    })
    .select('id')
    .single()
  if (error) throw error
  const { error: resaError } = await db.from('reservations').insert({
    event_id: event.id,
    party_size: 1,
    customer_name: `${TEST_PREFIX} Client`,
    customer_email: testEmail(),
    status: 'confirmed',
    source: 'manual',
  })
  if (resaError) throw resaError

  await page.goto('/admin/programme')
  await eventRow(page, title).getByRole('button', { name: 'Modifier' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByLabel(/Événement privé/).check()
  await expect(page.getByRole('alert')).toContainText('Cet événement a déjà 1 réservation(s)')
  await page.getByRole('button', { name: 'Annuler' }).click()
})
