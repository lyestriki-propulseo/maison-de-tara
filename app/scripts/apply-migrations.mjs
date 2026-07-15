// Applique les migrations Supabase (+ seed) sur la base distante, sans Docker ni CLI.
// Lit SUPABASE_DB_URL depuis app/.env. Tout dans UNE transaction (rollback si erreur).
//   Usage : cd app && node scripts/apply-migrations.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')

// Mini-parseur .env (on ne veut pas de dépendance dotenv)
const envText = readFileSync(join(here, '..', '.env'), 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}
const connectionString = env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL manquant dans app/.env')
  process.exit(1)
}

const migrationsDir = join(repoRoot, 'supabase', 'migrations')
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

// TLS CHIFFRÉ sans vérification de CA (= sslmode=require, mode par défaut documenté de Supabase
// pour les connexions directes ; leur CA n'est pas publique). Choix ASSUMÉ par l'utilisateur pour
// cette migration ponctuelle machine→sa propre base. Pour une vérif complète : télécharger la CA
// Supabase et la passer via ssl.ca.
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query('BEGIN')
  for (const f of files) {
    process.stdout.write(`→ ${f} ... `)
    await client.query(readFileSync(join(migrationsDir, f), 'utf8'))
    console.log('ok')
  }
  process.stdout.write('→ seed.sql ... ')
  await client.query(readFileSync(join(repoRoot, 'supabase', 'seed.sql'), 'utf8'))
  console.log('ok')
  await client.query('COMMIT')
  console.log('\n✅ Migrations + seed appliqués (transaction validée).')
} catch (e) {
  try {
    await client.query('ROLLBACK')
  } catch {
    /* ignore */
  }
  console.error('\n❌ Échec — rollback effectué. Détail :', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
