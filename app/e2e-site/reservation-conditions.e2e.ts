import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockSupabase } from './support/supabase-mock'
import type { AvailabilityEvent, ContentRow } from './support/supabase-mock'

// US-001 — conditions d'annulation (atelier / événement) et mention de paiement des événements,
// éditables depuis /admin/contenu. Voir docs/us/US-001-conditions-annulation-editables.md.

const PAGE = '/wandau-mdt/atelier.html'
const COND_ATELIER = 'atelier.reserve.conditions'
const COND_EVENEMENT = 'atelier.reserve.conditions_evenement'
const PAIEMENT_EVENEMENT = 'atelier.reserve.acompte_evenement'

const EVENT: AvailabilityEvent = {
  id: '00000000-0000-4000-8000-000000000001',
  title: '[TEST] Soirée',
  starts_at: '2099-01-15T17:30:00Z',
  availability: 'disponible',
  price_cents: 4000,
}

function rows(values: Record<string, string | null>): ContentRow[] {
  return Object.entries(values).map(([field_key, text_value]) => ({
    field_key,
    field_type: 'text',
    text_value,
  }))
}

const field = (page: Page, key: string) => page.locator(`[data-mdt-content="${key}"]`)

async function chooseMode(page: Page, mode: 'atelier' | 'evenement') {
  await page.locator(`input[name="mode"][value="${mode}"]`).check({ force: true })
}

test('CA-02 — le texte saisi s’affiche sous le paiement, la phrase « remboursé » a disparu', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: { atelier: rows({ [COND_ATELIER]: 'Report possible jusqu’à 48 h avant.' }) },
  })
  const html = await (await page.request.get(PAGE)).text()
  expect(html).not.toMatch(/rembours/i)

  await page.goto(PAGE)
  await expect(field(page, COND_ATELIER)).toHaveText('Report possible jusqu’à 48 h avant.')
  await expect(field(page, COND_ATELIER)).toBeVisible()
  await expect(page.getByText(/rembours/i)).toHaveCount(0)
  const sousLePaiement = await page.evaluate(
    ({ acompte, cond }) => {
      const a = document.getElementById(acompte)
      const c = document.querySelector(`[data-mdt-content="${cond}"]`)
      return Boolean(a && c && a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)
    },
    { acompte: 'rf-acompte-atelier', cond: COND_ATELIER },
  )
  expect(sousLePaiement).toBe(true)
})

test('CA-03 — bascule Atelier libre / Événement : seul le texte du mode affiché est visible', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      atelier: rows({
        [COND_ATELIER]: 'Conditions atelier',
        [COND_EVENEMENT]: 'Conditions événement',
      }),
    },
  })
  await page.goto(PAGE)
  await expect(field(page, COND_ATELIER)).toBeVisible()
  await expect(field(page, COND_EVENEMENT)).toBeHidden()

  await chooseMode(page, 'evenement')
  await expect(field(page, COND_EVENEMENT)).toBeVisible()
  await expect(field(page, COND_ATELIER)).toBeHidden()

  await chooseMode(page, 'atelier')
  await expect(field(page, COND_ATELIER)).toBeVisible()
  await expect(field(page, COND_EVENEMENT)).toBeHidden()
})

for (const ordre of [
  { nom: 'contenu reçu avant les disponibilités', availabilityDelayMs: 800 },
  { nom: 'contenu reçu après les disponibilités', contentDelayMs: 800 },
]) {
  test(`CA-03 — arrivée par ?event= (${ordre.nom}) : seul le texte événement est visible`, async ({
    page,
  }) => {
    await mockSupabase(page, {
      ...ordre,
      events: [EVENT],
      content: {
        atelier: rows({
          [COND_ATELIER]: 'Conditions atelier',
          [COND_EVENEMENT]: 'Conditions événement',
        }),
      },
    })
    await page.goto(`${PAGE}?event=${EVENT.id}`)
    await expect(field(page, COND_EVENEMENT)).toHaveText('Conditions événement')
    await expect(field(page, COND_EVENEMENT)).toBeVisible()
    await expect(page.locator('.evt-pick.is-selected')).toHaveCount(1)
    await expect(field(page, COND_ATELIER)).toBeHidden()
  })
}

test('CA-04 — champ vidé : aucune ligne de conditions, dans les deux modes', async ({ page }) => {
  await mockSupabase(page, {
    content: { atelier: rows({ [COND_ATELIER]: null, [COND_EVENEMENT]: null }) },
  })
  await page.goto(PAGE)
  // Attend que le contenu soit appliqué : le champ vide est retiré de la page.
  await expect(field(page, COND_ATELIER)).toHaveCount(0)
  await chooseMode(page, 'evenement')
  await expect(field(page, COND_EVENEMENT)).toHaveCount(0)
  await expect(page.locator('.refund-policy:visible')).toHaveCount(0)
})

test('CA-06 — Supabase injoignable : aucune ligne de conditions, jamais « remboursé »', async ({
  page,
}) => {
  await mockSupabase(page, { down: true })
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  await expect(field(page, COND_ATELIER)).toBeHidden()
  await chooseMode(page, 'evenement')
  await expect(field(page, COND_EVENEMENT)).toBeHidden()
  await expect(page.getByText(/rembours/i)).toHaveCount(0)
})

test('CA-07 — « Paiement — événement » : texte de Tara avant le choix, remplacé par le montant ensuite', async ({
  page,
}) => {
  await mockSupabase(page, {
    events: [EVENT],
    content: {
      atelier: rows({ [PAIEMENT_EVENEMENT]: 'Le prix se règle en ligne (texte de Tara).' }),
    },
  })
  await page.goto(PAGE)
  await chooseMode(page, 'evenement')
  await expect(field(page, PAIEMENT_EVENEMENT)).toHaveText(
    'Le prix se règle en ligne (texte de Tara).',
  )
  await expect(field(page, PAIEMENT_EVENEMENT)).toBeVisible()

  await page.locator(`.evt-pick[data-id="${EVENT.id}"]`).click()
  await expect(page.locator('#rf-prix-evenement')).toBeVisible()
  await expect(page.locator('#rf-prix-evenement')).toContainText('40')
  await expect(field(page, PAIEMENT_EVENEMENT)).toBeHidden()
})
