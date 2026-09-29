import { expect, test } from '@playwright/test'

// Chaque page de l'admin se charge depuis le menu, sans erreur (bandeau, écran d'erreur, exception).
const PAGES = [
  { link: 'Accueil', heading: 'Tableau de bord' },
  { link: 'Réservations', heading: 'Planning de l’atelier' },
  { link: 'Contenu', heading: 'Contenu du site' },
  { link: 'Horaires', heading: /Horaires d.ouverture/ },
  { link: 'Newsletter', heading: 'Newsletter' },
  { link: 'Demandes', heading: 'Demandes' },
]

for (const { link, heading } of PAGES) {
  test(`la page « ${link} » s’ouvre sans erreur`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/admin')
    await page.getByRole('navigation', { name: 'Navigation admin' }).getByRole('link', { name: link, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('la rubrique Réservations regroupe ses quatre onglets', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const menu = page.getByRole('navigation', { name: 'Navigation admin' })
  const tabs = page.getByRole('navigation', { name: 'Rubrique Réservations' })

  await page.goto('/admin')
  await menu.getByRole('link', { name: 'Réservations', exact: true }).click()
  for (const [tab, heading] of [
    ['Événements', 'Événements'],
    ['Réservations', 'Réservations'],
    ['Réglages', 'Réglages'],
    ['Planning', 'Planning de l’atelier'],
  ] as const) {
    await tabs.getByRole('link', { name: tab, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible()
    await expect(tabs.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page')
    // L'entrée « Réservations » du menu reste en surbrillance sur chaque onglet.
    await expect(menu.getByRole('link', { name: 'Réservations', exact: true })).toHaveClass(/is-active/)
  }
  await expect(page.getByRole('heading', { name: 'Grille hebdomadaire' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('les filtres des listes en lecture seule répondent', async ({ page }) => {
  await page.goto('/admin/newsletter')
  for (const name of [/^En attente \(/, /^Désabonnés \(/, /^Tous \(/, /^Confirmés \(/]) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.goto('/admin/demandes')
  for (const name of [/^En cours \(/, /^Traitées \(/, /^Toutes \(/, /^Nouvelles \(/]) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.getByRole('alert')).toHaveCount(0)
})
