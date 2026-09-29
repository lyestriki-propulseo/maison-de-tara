import { expect, test } from '@playwright/test'
import { testDb } from './support/db'
import { TEST_PREFIX } from './support/env'

// Contenu : un texte et un cadrage de photo modifiés puis remis EXACTEMENT à l'identique.
// Non testé en prod : changer une photo (fichier public remplacé, restauration impossible
// depuis l'admin) et les coordonnées globales (affichées sur tout le site).
test.describe.configure({ mode: 'serial' })

type Block = {
  id: string
  label: string
  text_value: string | null
  image_focus_x: number
  image_focus_y: number
  image_caption: string | null
}

let textBlock: Block
let imageBlock: Block

test.beforeAll(async () => {
  const db = testDb()
  const columns = 'id, label, text_value, image_focus_x, image_focus_y, image_caption'
  const text = await db
    .from('content_blocks')
    .select(columns)
    .eq('page', 'calendrier')
    .eq('field_type', 'text')
    .not('text_value', 'is', null)
    .order('sort_order')
    .limit(1)
    .single()
  if (text.error) throw text.error
  textBlock = text.data
  const image = await db
    .from('content_blocks')
    .select(columns)
    .eq('page', 'accueil')
    .eq('field_type', 'image')
    .not('image_path', 'is', null)
    .order('sort_order')
    .limit(1)
    .single()
  if (image.error) throw image.error
  imageBlock = image.data
})

test.afterAll(async () => {
  const db = testDb()
  await db.from('content_blocks').update({ text_value: textBlock.text_value }).eq('id', textBlock.id)
  await db
    .from('content_blocks')
    .update({
      image_focus_x: imageBlock.image_focus_x,
      image_focus_y: imageBlock.image_focus_y,
      image_caption: imageBlock.image_caption,
    })
    .eq('id', imageBlock.id)
})

test('modifier un texte du site puis remettre l’original', async ({ page }) => {
  await page.goto('/admin/contenu')
  await page.getByRole('button', { name: 'Calendrier', exact: true }).click()
  // Le <label> englobe le libellé, le textarea et le bouton : on part du label pour tout cibler.
  const block = page.locator('label').filter({ hasText: textBlock.label }).first()
  const field = block.locator('textarea')
  const save = block.getByRole('button', { name: 'Enregistrer' })

  await field.fill(`${TEST_PREFIX} texte temporaire`)
  await save.click()
  await expect(page.getByRole('status')).toContainText('Texte enregistré.')
  const changed = await testDb().from('content_blocks').select('text_value').eq('id', textBlock.id).single()
  expect(changed.data?.text_value).toBe(`${TEST_PREFIX} texte temporaire`)

  await field.fill(textBlock.text_value ?? '')
  await save.click()
  await expect(page.getByRole('status')).toContainText('Texte enregistré.')
  const restored = await testDb().from('content_blocks').select('text_value').eq('id', textBlock.id).single()
  expect(restored.data?.text_value).toBe(textBlock.text_value)
})

test('ajuster le cadrage d’une photo puis le remettre', async ({ page }) => {
  await page.goto('/admin/contenu')
  // Ligne de la photo = parent direct du libellé exact (il contient aussi ses boutons).
  const block = page.getByText(imageBlock.label, { exact: true }).locator('xpath=..')

  await block.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  await page.getByLabel('Position horizontale').fill('30')
  await page.getByRole('button', { name: 'Enregistrer le cadrage' }).click()
  await expect(page.getByRole('status')).toContainText('Cadrage enregistré.')
  const changed = await testDb().from('content_blocks').select('image_focus_x').eq('id', imageBlock.id).single()
  expect(Number(changed.data?.image_focus_x)).toBe(30)

  // « Annuler » ne doit rien enregistrer.
  await block.getByRole('button', { name: 'Ajuster le cadrage' }).click()
  await page.getByLabel('Position horizontale').fill('80')
  await page.getByRole('button', { name: 'Annuler' }).click()
  const unchanged = await testDb().from('content_blocks').select('image_focus_x').eq('id', imageBlock.id).single()
  expect(Number(unchanged.data?.image_focus_x)).toBe(30)
})
