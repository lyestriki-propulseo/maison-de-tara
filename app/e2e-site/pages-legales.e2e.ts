import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockSupabase } from './support/supabase-mock'
import type { ContentRow } from './support/supabase-mock'

// US-002 — pages Mentions légales et Politique de confidentialité éditables depuis /admin/contenu.
// Voir docs/us/US-002-pages-legales-editables.md. Mise en forme fine : tests/content-format.test.mjs
// (dépôt du site).

const MENTIONS = '/wandau-mdt/mentions-legales.html'
const POLITIQUE = '/wandau-mdt/politique-de-confidentialite.html'

function rows(values: Record<string, string | null>): ContentRow[] {
  return Object.entries(values).map(([field_key, text_value]) => ({
    field_key,
    field_type: 'text',
    text_value,
  }))
}

const field = (page: Page, key: string) => page.locator(`[data-mdt-content="${key}"]`)
const section = (page: Page, titleKey: string) =>
  page.locator(`[data-mdt-hide-if-empty="${titleKey}"]`).filter({ has: field(page, titleKey) })

test('CA-02 — titre et texte modifiés remplacent l’ancien contenu ; la ligne Contact suit les Coordonnées', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      global: rows({ 'global.contact.email': 'bonjour@exemple.fr' }),
      'mentions-legales': rows({
        'mentions-legales.hebergement.titre': 'Hébergeur du site',
        'mentions-legales.hebergement.texte': 'Hébergeur fictif, 1 rue du Test',
      }),
    },
  })
  await page.goto(MENTIONS)
  const hebergement = section(page, 'mentions-legales.hebergement.titre')
  await expect(hebergement.locator('h2')).toHaveText('Hébergeur du site')
  await expect(field(page, 'mentions-legales.hebergement.texte')).toHaveText(
    'Hébergeur fictif, 1 rue du Test',
  )
  await expect(hebergement).not.toContainText('Kellermann')

  const contact = page.locator('.mdt-legal a[data-mdt-content="global.contact.email"]')
  await expect(contact).toHaveText('bonjour@exemple.fr')
  await expect(contact).toHaveAttribute('href', 'mailto:bonjour@exemple.fr')
})

test('CA-03 — retour à la ligne = nouvelle ligne, ligne vide = nouveau paragraphe', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      'mentions-legales': rows({
        'mentions-legales.editeur.texte':
          'Maison de Tara SAS\nSIRET : 123\n\n\n  \nDirectrice : Tara',
      }),
    },
  })
  await page.goto(MENTIONS)
  const texte = field(page, 'mentions-legales.editeur.texte')
  await expect(texte.locator('p')).toHaveCount(2)
  await expect(texte.locator('p').first()).toHaveText('Maison de Tara SASSIRET : 123')
  await expect(texte.locator('p').first().locator('br')).toHaveCount(1)
  await expect(texte.locator('p').nth(1)).toHaveText('Directrice : Tara')
})

test('CA-04 — emails et liens web cliquables, ponctuation hors du lien, HTML jamais interprété', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      // La synchro des Coordonnées ne doit pas réécrire un lien saisi par Tara.
      global: rows({ 'global.contact.email': 'autre@exemple.fr' }),
      confidentialite: rows({
        'confidentialite.droits.texte':
          'Écrivez-nous à contact@maisondetara.com. Voir https://www.cnil.fr. <img src=x onerror="window.__xss=1"> <b>gras</b>',
      }),
    },
  })
  await page.goto(POLITIQUE)
  const texte = field(page, 'confidentialite.droits.texte')
  await expect(texte.locator('a')).toHaveCount(2)
  const email = texte.locator('a').first()
  await expect(email).toHaveText('contact@maisondetara.com')
  await expect(email).toHaveAttribute('href', 'mailto:contact@maisondetara.com')
  const web = texte.locator('a').nth(1)
  await expect(web).toHaveText('https://www.cnil.fr')
  await expect(web).toHaveAttribute('href', 'https://www.cnil.fr')
  await expect(web).toHaveAttribute('target', '_blank')
  await expect(web).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(texte).toContainText('<img src=x onerror="window.__xss=1"> <b>gras</b>')
  await expect(texte.locator('img, b')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})

test('CA-05 — une liste : une ligne non vide = une puce', async ({ page }) => {
  await mockSupabase(page, {
    content: {
      confidentialite: rows({
        'confidentialite.conservation.liste':
          'Réservations : 3 ans\n\n   \nNewsletter : jusqu’à désinscription',
      }),
    },
  })
  await page.goto(POLITIQUE)
  const liste = field(page, 'confidentialite.conservation.liste')
  await expect(liste.locator('li')).toHaveText([
    'Réservations : 3 ans',
    'Newsletter : jusqu’à désinscription',
  ])
})

test('CA-06 — titre vidé = section masquée ; autre champ vidé = ce bloc seul retiré', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      confidentialite: rows({
        'confidentialite.cookies.titre': null,
        'confidentialite.cookies.texte': 'Ne doit pas apparaître',
        'confidentialite.donnees.intro': null,
      }),
    },
  })
  await page.goto(POLITIQUE)
  await expect(section(page, 'confidentialite.cookies.titre')).toHaveCount(0)
  await expect(page.getByText('Ne doit pas apparaître')).toHaveCount(0)
  await expect(field(page, 'confidentialite.donnees.intro')).toHaveCount(0)
  // L'ancien texte statique de l'introduction ne revient pas ; le reste de la section demeure.
  await expect(page.getByText('Le site collecte uniquement les données')).toHaveCount(0)
  await expect(field(page, 'confidentialite.donnees.liste')).toBeVisible()
  await expect(field(page, 'confidentialite.donnees.titre')).toBeVisible()
})

test('CA-06 — section « Éditeur » masquée : la ligne Contact obligatoire reste affichée', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      global: rows({ 'global.contact.email': 'bonjour@exemple.fr' }),
      'mentions-legales': rows({ 'mentions-legales.editeur.titre': null }),
    },
  })
  await page.goto(MENTIONS)
  await expect(section(page, 'mentions-legales.editeur.titre')).toHaveCount(0)
  await expect(field(page, 'mentions-legales.editeur.texte')).toHaveCount(0)
  await expect(page.locator('.mdt-legal a[data-mdt-content="global.contact.email"]')).toHaveText(
    'bonjour@exemple.fr',
  )
})

test('CA-07 — Supabase injoignable : le texte statique des deux pages reste affiché', async ({
  page,
}) => {
  await mockSupabase(page, { down: true })
  await page.goto(MENTIONS)
  await expect(field(page, 'mentions-legales.hebergement.titre')).toHaveText('Hébergement')
  await expect(field(page, 'mentions-legales.hebergement.texte')).toContainText('OVH SAS')
  await page.goto(POLITIQUE)
  await expect(page.locator('.mdt-legal h2')).toHaveCount(8)
  await expect(field(page, 'confidentialite.destinataires.liste').locator('li')).toHaveCount(5)
})
