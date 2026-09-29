import { expect, test } from '@playwright/test'

// Sans session : la garde renvoie vers /login, et un mauvais mot de passe est refusé proprement.
test.use({ storageState: { cookies: [], origins: [] } })

test('une page admin sans session renvoie vers la connexion', async ({ page }) => {
  await page.goto('/admin/programme')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible()
})

test('un mauvais mot de passe affiche une erreur sans entrer', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByLabel('Adresse e-mail').fill('e2e+inconnu@example.com')
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})
