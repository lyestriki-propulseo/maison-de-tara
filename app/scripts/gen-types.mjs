// Génère src/types/database.types.ts par introspection directe de la base (sans Docker/CLI).
// Lit SUPABASE_DB_URL depuis app/.env.  Usage : cd app && node scripts/gen-types.mjs
import { readFileSync, writeFileSync } from 'node:fs'
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

// TLS CHIFFRÉ sans vérif de CA (= sslmode=require, mode par défaut Supabase pour la connexion
// directe ; verify-full ne passe pas sur cet endpoint). Choix ASSUMÉ par l'utilisateur, lecture seule.
const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

const enums = {}
const er = await client.query(`
  select t.typname as name, e.enumlabel as label
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder`)
for (const r of er.rows) (enums[r.name] ||= []).push(r.label)

const cr = await client.query(`
  select table_name, column_name, is_nullable, udt_name, column_default
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position`)
const tables = {}
for (const r of cr.rows) (tables[r.table_name] ||= []).push(r)

function tsType(u) {
  if (enums[u]) return `Database['public']['Enums']['${u}']`
  if (
    [
      'timestamptz',
      'timestamp',
      'date',
      'time',
      'timetz',
      'text',
      'varchar',
      'bpchar',
      'uuid',
      'name',
    ].includes(u)
  )
    return 'string'
  if (['int2', 'int4', 'int8', 'numeric', 'float4', 'float8'].includes(u)) return 'number'
  if (u === 'bool') return 'boolean'
  if (['json', 'jsonb'].includes(u)) return 'Json'
  return 'string'
}

let out = `// Généré par scripts/gen-types.mjs (introspection de la base). Ne pas éditer à la main.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
`
for (const [table, cols] of Object.entries(tables)) {
  out += `      ${table}: {\n        Row: {\n`
  for (const c of cols)
    out += `          ${c.column_name}: ${tsType(c.udt_name)}${c.is_nullable === 'YES' ? ' | null' : ''}\n`
  out += `        }\n        Insert: {\n`
  for (const c of cols) {
    const opt = c.is_nullable === 'YES' || c.column_default != null
    out += `          ${c.column_name}${opt ? '?' : ''}: ${tsType(c.udt_name)}${c.is_nullable === 'YES' ? ' | null' : ''}\n`
  }
  out += `        }\n        Update: {\n`
  for (const c of cols)
    out += `          ${c.column_name}?: ${tsType(c.udt_name)}${c.is_nullable === 'YES' ? ' | null' : ''}\n`
  out += `        }\n        Relationships: []\n      }\n`
}
out += `    }\n    Views: { [_ in never]: never }\n    Functions: { [_ in never]: never }\n    Enums: {\n`
for (const [name, labels] of Object.entries(enums))
  out += `      ${name}: ${labels.map((l) => `'${l}'`).join(' | ')}\n`
out += `    }\n    CompositeTypes: { [_ in never]: never }\n  }\n}\n`

writeFileSync(join(here, '..', 'src', 'types', 'database.types.ts'), out)
await client.end()
console.log(
  `✅ Types générés : ${Object.keys(tables).length} tables, ${Object.keys(enums).length} enums`,
)
