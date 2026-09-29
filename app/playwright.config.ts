import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './e2e/support/env'

// Tests de bout en bout de l'admin, lancés CONTRE LA BASE DE PRODUCTION (choix du 29/09).
// Règles : données préfixées [TEST] / e-mails e2e+…@example.com, valeurs d'origine restaurées,
// jamais de paiement finalisé. Exécution en série (état partagé).
//   Local (code en cours, base de prod) : pnpm dev puis pnpm e2e
//   Admin en ligne : E2E_BASE_URL=https://admin.maisondetara.propulseo-site.com pnpm e2e
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  outputDir: 'e2e/.results',
  use: {
    baseURL: e2eEnv.baseURL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'connexion', testMatch: /auth\.setup\.e2e\.ts/ },
    {
      name: 'admin',
      dependencies: ['connexion'],
      testIgnore: /auth\.setup\.e2e\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: 'e2e/.auth/staff.json' },
    },
  ],
})
