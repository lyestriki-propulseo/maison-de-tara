// Applique UNE seule migration (celle donnée en argument) sur la base distante, sans Docker ni CLI.
// Contrairement à apply-migrations.mjs (qui rejoue tout depuis zéro), utile pour ajouter une
// migration sur une base déjà vivante. Lit SUPABASE_DB_URL depuis app/.env.
//   Usage : cd app && node scripts/apply-one-migration.mjs <nom-du-fichier.sql>
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')

const fileName = process.argv[2]
if (!fileName) {
  console.error('❌ Usage : node scripts/apply-one-migration.mjs <nom-du-fichier.sql>')
  process.exit(1)
}

const envText = readFileSync(join(here, '..', '.env'), 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

// TLS chiffré sans vérification de CA (= sslmode=require, cf. apply-migrations.mjs pour le détail
// du choix assumé : CA Supabase non publique, verify-full impossible sur l'endpoint direct).
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
const sql = readFileSync(join(repoRoot, 'supabase', 'migrations', fileName), 'utf8')

try {
  await client.connect()
  await client.query('BEGIN')
  await client.query(sql)
  await client.query('COMMIT')
  console.log(`✅ ${fileName} appliqué.`)
} catch (e) {
  try {
    await client.query('ROLLBACK')
  } catch {
    /* ignore */
  }
  console.error(`❌ Échec — rollback effectué. Détail :`, e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
