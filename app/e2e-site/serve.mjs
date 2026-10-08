// Serveur statique minimal pour les tests du site public (playwright.site.config.ts).
// Racine servie : SITE_ROOT (ex. C:/mdt-site, le worktree du site) ou, par défaut, la racine du
// dépôt. Pas de cache : chaque test lit les fichiers tels qu'ils sont sur le disque.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(process.env.SITE_ROOT ?? fileURLToPath(new URL('../..', import.meta.url)))
const PORT = Number(process.env.SITE_PORT ?? 4390)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname))
  const file = join(ROOT, path)
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    res.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(PORT, '127.0.0.1', () =>
  console.log(`site servi depuis ${ROOT} sur http://127.0.0.1:${PORT}`),
)
