import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Variables des tests E2E : app/.env (clés Supabase serveur, pour préparer / vérifier / nettoyer)
// et app/.env.e2e.local (compte staff de test, jamais versionné).
const APP_DIR = join(import.meta.dirname, '..', '..')

function readEnvFile(file: string): Record<string, string> {
  const path = join(APP_DIR, file)
  if (!existsSync(path)) return {}
  const entries: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    entries[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
  }
  return entries
}

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.e2e.local'), ...process.env }

function required(name: string): string {
  const value = env[name]
  if (!value) throw new Error(`Variable manquante pour les tests E2E : ${name}`)
  return value
}

export const e2eEnv = {
  baseURL: env.E2E_BASE_URL ?? 'http://localhost:3000',
  email: () => required('E2E_EMAIL'),
  password: () => required('E2E_PASSWORD'),
  supabaseUrl: () => required('SUPABASE_URL'),
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
}

// Préfixes qui marquent TOUTES les données créées par les tests (nettoyage ciblé).
export const TEST_PREFIX = '[TEST]'
export const TEST_EMAIL_DOMAIN = '@example.com'
export function testEmail() {
  return `e2e+${Date.now()}${TEST_EMAIL_DOMAIN}`
}
