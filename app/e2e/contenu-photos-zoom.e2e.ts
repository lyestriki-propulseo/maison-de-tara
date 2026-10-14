import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { differenceWithAdminFraming } from '../e2e-site/support/framing'
import { testDb } from './support/db'

// US-003 — cadrage des photos avec zoom dans Contenu (docs/us/US-003-cadrage-photos-zoom.md).
// Base de PRODUCTION : le cadrage modifié est remis EXACTEMENT à l'identique (afterAll). Aucune
// photo n'est envoyée (fichier public remplacé, restauration impossible depuis l'admin).
test.describe.configure({ mode: 'serial' })

const KEY = 'atelier.ch01.photo'
const NEW_FILE = join(import.meta.dirname, '..', '..', 'assets-premium-lp', 'sortie-four.jpg')

type Row = {
  id: string
  section: string
  image_path: string | null
  image_caption: string | null
  image_focus_x: number
  image_focus_y: number
  image_zoom: number
  image_fill: string | null
}

let row: Row

test.beforeAll(async () => {
  const { data, error } = await testDb()
    .from('content_blocks')
    .select(
      'id, section, image_path, image_caption, image_focus_x, image_focus_y, image_zoom, image_fill',
    )
    .eq('field_key', KEY)
    .single()
  if (error) throw error
  row = data
})

test.afterAll(async () => {
  await testDb()
    .from('content_blocks')
    .update({
      image_caption: row.image_caption,
      image_focus_x: row.image_focus_x,
      image_focus_y: row.image_focus_y,
      image_zoom: row.image_zoom,
      image_fill: row.image_fill,
    })
    .eq('id', row.id)
})

async function openAtelier(page: Page) {
  await page.goto('/admin/contenu')
  await page.getByRole('button', { name: 'Atelier', exact: true }).click()
  // Les photos de l'Atelier s'appellent toutes « Photo » : on cible la section (une photo chacune).
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: row.section, exact: true }),
  })
}

const zoomSlider = (page: Page) => page.getByRole('slider', { name: /Zoom/ })
const preview = (page: Page) => page.getByRole('img', { name: 'Aperçu du cadrage' })

test('CA-01 — aperçu à la forme de l’arche ; photos « Certaines réalisations » absentes', async ({
  page,
}) => {
  const block = await openAtelier(page)
  await block.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  const box = await preview(page).boundingBox()
  expect(box).not.toBeNull()
  expect(Math.abs((box?.width ?? 0) / (box?.height ?? 1) - 0.741)).toBeLessThan(0.01)
  expect(await preview(page).evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toBe(
    '6px',
  )
  await page.getByRole('button', { name: 'Annuler' }).click()

  const hidden = await testDb()
    .from('content_blocks')
    .select('section')
    .like('field_key', 'accueil.realisations.photo%')
  expect(hidden.data?.length).toBe(6)
  await page.getByRole('button', { name: 'Accueil', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ajuster le cadrage' }).first()).toBeVisible()
  // La section garde ses textes, mais plus aucune photo.
  const realisations = page.locator('section').filter({
    has: page.getByRole('heading', { name: hidden.data?.[0]?.section ?? '', exact: true }),
  })
  await expect(realisations).toBeVisible()
  await expect(realisations.locator('img')).toHaveCount(0)
  await expect(realisations.getByText('Changer la photo')).toHaveCount(0)
})

test('CA-02 / CA-04 / CA-07 — zoomer sans renvoyer le fichier, enregistrer, rouvrir', async ({
  page,
}) => {
  const block = await openAtelier(page)
  await block.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  await page.getByRole('button', { name: 'Zoomer', exact: true }).click()
  await page.getByRole('button', { name: 'Zoomer', exact: true }).click()
  await expect(zoomSlider(page)).toHaveValue(String(Math.round(row.image_zoom * 100) + 20))
  await zoomSlider(page).fill('240')
  await page.getByLabel('Position horizontale').fill('65')
  await page.getByLabel('Position verticale').fill('20')
  await expect(page.getByText('240 %')).toBeVisible()

  // L'aperçu montre exactement la zone que le site affichera (même calcul, cf. e2e-site).
  expect(await differenceWithAdminFraming(page, preview(page), 2.4, [65, 20])).toBeLessThan(6)

  await page.getByRole('button', { name: 'Enregistrer le cadrage' }).click()
  await expect(page.getByRole('status')).toContainText('Cadrage enregistré.')
  const saved = await testDb()
    .from('content_blocks')
    .select('image_path, image_zoom, image_focus_x, image_focus_y')
    .eq('id', row.id)
    .single()
  expect(Number(saved.data?.image_zoom)).toBe(2.4)
  expect(Number(saved.data?.image_focus_x)).toBe(65)
  expect(Number(saved.data?.image_focus_y)).toBe(20)
  expect(saved.data?.image_path).toBe(row.image_path)

  await page.reload()
  const reopened = await openAtelier(page)
  await reopened.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  await expect(zoomSlider(page)).toHaveValue('240')
  await expect(page.getByLabel('Position horizontale')).toHaveValue('65')
  await expect(page.getByLabel('Position verticale')).toHaveValue('20')
  await page.getByRole('button', { name: 'Annuler' }).click()
})

test('CA-03 — nouvelle photo choisie : repart de 100 %, même zoom disponible (sans envoi)', async ({
  page,
}) => {
  const block = await openAtelier(page)
  await block.getByLabel('Changer la photo').setInputFiles(NEW_FILE)
  await expect(zoomSlider(page)).toHaveValue('100')
  await expect(page.getByRole('button', { name: 'Enregistrer le cadrage' })).toBeEnabled()
  await page.getByRole('button', { name: 'Zoomer', exact: true }).click()
  await zoomSlider(page).fill('180')
  expect(await differenceWithAdminFraming(page, preview(page), 1.8, [50, 50])).toBeLessThan(6)
  await page.getByRole('button', { name: 'Annuler' }).click()

  const after = await testDb().from('content_blocks').select('image_path').eq('id', row.id).single()
  expect(after.data?.image_path).toBe(row.image_path)
})

test('CA-02 / CA-05 / CA-07 / CA-08 v2 — dézoomer jusqu’à « Photo entière », couleur des bords enregistrée', async ({
  page,
}) => {
  const block = await openAtelier(page)
  await block.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  // Minimum connu une fois la photo chargée : le curseur tout à gauche = « Photo entière ».
  await expect(zoomSlider(page)).not.toHaveAttribute('min', '100')
  const min = (await zoomSlider(page).getAttribute('min')) ?? '100'
  await zoomSlider(page).fill(min)
  await expect(page.getByText('Photo entière', { exact: true })).toBeVisible()
  await page.getByLabel('Position verticale').fill('100')

  // Aperçu = calcul de l'admin, bande peinte de la couleur des bords.
  const fill = await preview(page).evaluate((el) => {
    const [r = 0, g = 0, b = 0] = (getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []).map(
      Number,
    )
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  })
  // L'icône « déplacer » (interface, pas cadrage) tombe ici sur la bande unie : masquée pour mesurer.
  await preview(page).evaluate((el) => {
    el.querySelector('span')?.style.setProperty('visibility', 'hidden')
  })
  expect(await differenceWithAdminFraming(page, preview(page), 0, [50, 100], fill)).toBeLessThan(6)

  await page.getByRole('button', { name: 'Enregistrer le cadrage' }).click()
  await expect(page.getByRole('status')).toContainText('Cadrage enregistré.')
  const saved = await testDb()
    .from('content_blocks')
    .select('image_path, image_zoom, image_focus_y, image_fill')
    .eq('id', row.id)
    .single()
  expect(Number(saved.data?.image_zoom)).toBe(0)
  expect(Number(saved.data?.image_focus_y)).toBe(100)
  expect(saved.data?.image_fill).toMatch(/^#[0-9a-f]{6}$/)
  expect(saved.data?.image_fill).toBe(fill)
  expect(saved.data?.image_path).toBe(row.image_path)

  await page.reload()
  const reopened = await openAtelier(page)
  await reopened.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  await expect(page.getByText('Photo entière', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Position verticale')).toHaveValue('100')
  await page.getByRole('button', { name: 'Annuler' }).click()
})
