import { expect, test } from '@playwright/test'
import { testDb } from './support/db'

// US-002 CA-01 — lecture seule : les pages « Mentions légales » et « Politique de confidentialité »
// apparaissent dans Contenu, chaque section dans l'ordre de la page, chaque champ avec un libellé
// unique, la valeur enregistrée en base, et l'aide « vider pour masquer » sur les titres.

const PAGES = [
  { value: 'mentions-legales', bouton: 'Mentions légales', sections: 6 },
  { value: 'confidentialite', bouton: 'Politique de confidentialité', sections: 8 },
]

for (const p of PAGES) {
  test(`CA-01 — Contenu › ${p.bouton} : sections dans l’ordre, libellés uniques, valeurs en base`, async ({
    page,
  }) => {
    const { data, error } = await testDb()
      .from('content_blocks')
      .select('section, field_key, label, text_value')
      .eq('page', p.value)
      .order('sort_order')
    if (error) throw error
    const sections = [...new Set(data.map((r) => r.section))]
    expect(sections).toHaveLength(p.sections)
    expect(new Set(data.map((r) => r.label)).size).toBe(data.length)

    await page.goto('/admin/contenu')
    await page.getByRole('button', { name: p.bouton, exact: true }).click()
    await expect(page.locator('section h2')).toHaveText(sections)

    for (const row of data) {
      const label = page.locator('label').filter({ hasText: row.label })
      await expect(label).toHaveCount(1)
      await expect(label.locator('textarea')).toHaveValue(row.text_value ?? '')
      if (row.field_key.endsWith('.titre')) {
        await expect(label).toContainText('vider pour masquer la section')
      }
    }
  })
}
