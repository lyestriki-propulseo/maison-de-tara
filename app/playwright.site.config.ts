import { defineConfig, devices } from '@playwright/test'

// Tests du site public (statique, wandau-mdt), servi en local par e2e-site/serve.mjs.
// Les réponses Supabase sont SIMULÉES (e2e-site/support/supabase-mock.ts) : jamais la prod.
//   Site du dépôt courant : pnpm e2e:site
//   Worktree du site      : SITE_ROOT=C:/mdt-site pnpm e2e:site
const PORT = Number(process.env.SITE_PORT ?? 4390)

export default defineConfig({
  testDir: './e2e-site',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  outputDir: 'e2e-site/.results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e-site/serve.mjs',
    url: `http://127.0.0.1:${PORT}/wandau-mdt/atelier.html`,
    reuseExistingServer: false,
    stdout: 'ignore',
  },
})
