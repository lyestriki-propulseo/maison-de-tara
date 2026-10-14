import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/supabase-mock'
import type { PrivateEventRow, PublicEventRow } from './support/supabase-mock'

// US-004 CA-03 — un événement privé publié apparaît au calendrier du site comme « Événement privé »,
// sans titre, description, prix ni bouton de réservation, et jamais sur l'accueil.
// Voir docs/us/US-004-evenement-prive.md.

const CALENDRIER = '/wandau-mdt/calendrier.html'
const ACCUEIL = '/wandau-mdt/index.html'
const MENTION = 'Événement privé — la Maison est privatisée'

const PUBLIC: PublicEventRow = {
  id: '00000000-0000-4000-8000-000000000002',
  title: '[TEST] Soirée publique',
  event_type: 'soiree',
  description: 'Une soirée ouverte à tous.',
  starts_at: '2099-03-10T18:30:00Z',
  ends_at: '2099-03-10T20:30:00Z',
  deposit_enabled: true,
  deposit_amount_cents: 4000,
}
const PRIVE: PrivateEventRow = {
  starts_at: '2099-03-12T18:30:00Z',
  ends_at: '2099-03-12T21:30:00Z',
}

test('CA-03 — calendrier : l’événement privé affiche seulement la mention et l’horaire', async ({
  page,
}) => {
  await mockSupabase(page, { publicEvents: [PUBLIC], privateEvents: [PRIVE] })
  await page.goto(CALENDRIER)
  const entries = page.locator('.prog-entry')
  await expect(entries).toHaveCount(2)

  const prive = entries.filter({ hasText: MENTION })
  await expect(prive).toHaveCount(1)
  await expect(prive.locator('.prog-time')).toHaveText('19h30–22h30')
  await expect(prive.locator('.prog-prix')).toHaveCount(0)
  await expect(prive.locator('.prog-desc')).toHaveCount(0)
  await expect(prive.locator('.btn-reserve')).toHaveCount(0)

  // Non-régression : l'événement public garde son prix et son bouton « Réserver ».
  const publique = entries.filter({ hasText: PUBLIC.title })
  await expect(publique.locator('.prog-prix')).toContainText('40')
  await expect(publique.locator('.btn-reserve')).toHaveCount(1)
})

test('CA-03 — accueil : l’événement privé n’apparaît pas dans les rendez-vous', async ({
  page,
}) => {
  await mockSupabase(page, { publicEvents: [PUBLIC], privateEvents: [PRIVE] })
  await page.goto(ACCUEIL)
  await expect(page.getByText(PUBLIC.title).first()).toBeAttached()
  await expect(page.getByText(MENTION)).toHaveCount(0)
})

test('CA-03 — si la liste des privés est injoignable, le calendrier garde les événements publics', async ({
  page,
}) => {
  await mockSupabase(page, {
    publicEvents: [PUBLIC],
    privateEvents: [PRIVE],
    privateEventsDown: true,
  })
  await page.goto(CALENDRIER)
  await expect(page.locator('.prog-entry')).toHaveCount(1)
  await expect(page.locator('.prog-entry')).toContainText(PUBLIC.title)
})
