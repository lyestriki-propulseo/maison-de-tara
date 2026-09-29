import { expect, test as setup } from '@playwright/test'
import { e2eEnv } from './support/env'

// Connexion unique du compte staff de test ; la session est réutilisée par tous les tests.
setup('connexion du compte staff de test', async ({ page }) => {
  // Attendre l'hydratation : un clic trop tôt soumet le formulaire HTML nu (page rechargée à vide).
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByLabel('Adresse e-mail').fill(e2eEnv.email())
  await page.getByLabel('Mot de passe').fill(e2eEnv.password())
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible()
  await page.context().storageState({ path: 'e2e/.auth/staff.json' })
})
