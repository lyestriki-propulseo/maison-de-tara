// Sème un planning d'atelier EXEMPLE (à ajuster avec Tara) : grille hebdo + créneaux des 14
// prochains jours. Idempotent (ON CONFLICT DO NOTHING). Usage : cd app && node scripts/seed-schedule.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(join(here, '..', '.env'), 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

// weekday : 0=dimanche ... 6=samedi ; [weekday, heure, capacité]
const TEMPLATES = [
  [2, '10:00', 12],
  [2, '14:00', 12],
  [2, '17:00', 12],
  [3, '10:00', 12],
  [3, '14:00', 12],
  [3, '17:00', 12],
  [4, '10:00', 12],
  [4, '14:00', 12],
  [4, '17:00', 12],
  [5, '10:00', 12],
  [5, '14:00', 12],
  [5, '17:00', 12],
  [6, '10:00', 16],
  [6, '14:00', 16],
  [6, '17:00', 16],
  [0, '11:00', 12],
  [0, '14:00', 12],
]

const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()
try {
  // 1) Grille hebdo (templates) si vide
  const { rows: existing } = await client.query(
    'select count(*)::int as n from public.session_templates',
  )
  if (existing[0].n === 0) {
    for (const [wd, time, cap] of TEMPLATES) {
      await client.query(
        'insert into public.session_templates (weekday, start_time, capacity) values ($1, $2, $3)',
        [wd, time, cap],
      )
    }
    console.log(`→ ${TEMPLATES.length} templates insérés`)
  } else {
    console.log(`→ templates déjà présents (${existing[0].n}), on garde`)
  }

  // 2) Générer les créneaux concrets des 14 prochains jours
  const { rows: templates } = await client.query(
    'select id, weekday, start_time, capacity from public.session_templates where active',
  )
  const now = new Date()
  let created = 0
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    for (const t of templates.filter((x) => x.weekday === d.getDay())) {
      const res = await client.query(
        `insert into public.session_instances (session_date, start_time, capacity, template_id)
         values ($1, $2, $3, $4) on conflict (session_date, start_time) do nothing`,
        [dateStr, t.start_time, t.capacity, t.id],
      )
      created += res.rowCount ?? 0
    }
  }
  console.log(`✅ ${created} créneaux créés sur 14 jours`)
} finally {
  await client.end()
}
