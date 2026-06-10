// Captures multi-viewport d'une page servie localement (référence de non-régression visuelle).
//
// Prérequis :
//   1. Playwright : à la racine du repo, `npm i -D playwright && npx playwright install chromium`
//   2. Serveur statique du repo lancé : `pwsh tools/serve.ps1`  (sert http://localhost:8000)
//
// Usage :
//   node wandau-mdt/tools/visual-check.mjs <page.html> [baseURL]
//   ex : node wandau-mdt/tools/visual-check.mjs index.html
//
// Sortie : wandau-mdt/tools/shots/<page>-<viewport>.png  (mobile / tablette / desktop)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const page = process.argv[2] || 'index.html';
const baseURL = (process.argv[3] || 'http://localhost:8000/wandau-mdt/').replace(/\/?$/, '/');
const OUT = join(fileURLToPath(new URL('.', import.meta.url)), 'shots');

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 900 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await ctx.newPage();
    await p.goto(baseURL + page, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200); // laisser le preloader / les animations se terminer
    const file = join(OUT, `${basename(page, '.html')}-${vp.name}.png`);
    await p.screenshot({ path: file, fullPage: true });
    console.log('✓', file);
    await ctx.close();
  }
  console.log('Captures terminées.');
} finally {
  await browser.close();
}
