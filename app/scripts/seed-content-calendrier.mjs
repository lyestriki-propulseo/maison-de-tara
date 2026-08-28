// Sème les 9 champs de contenu éditable du Calendrier : texte tel quel (sans mise en forme, cf.
// décision produit) + photos actuelles du site uploadées dans le bucket Storage 'medias'.
// Idempotent (upsert sur page+field_key) : peut être relancé sans dupliquer.
//   Usage : cd app && node scripts/seed-content-calendrier.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(join(here, '..', '.env'), 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Racine du worktree du site (adapter si déplacé) : les chemins d'image ci-dessous en partent.
const SITE_ROOT = 'C:/mdt-site'

const PAGE = 'calendrier'
let order = 0
const next = () => order++

const TEXT = [
  ['Hero', 'calendrier.hero.eyebrow', 'Amorce', 'Le calendrier'],
  ['Hero', 'calendrier.hero.titre', 'Titre', 'Les prochains rendez-vous'],
  ['Hero', 'calendrier.hero.intro', 'Introduction', 'Ateliers, événements et nouveautés de la boutique : tout ce qui se passe à la maison. Cliquez sur une date marquée pour en savoir plus.'],

  ['Le programme', 'calendrier.programme.titre', 'Titre', 'Le programme de la maison'],
  ['Le programme', 'calendrier.programme.note', 'Note de tri', 'Par ordre de date'],

  ['Sortie de page', 'calendrier.envoi.texte', 'Texte', 'Une date vous fait envie ?'],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'calendrier.hero.photo1', 'Photo 1', 'assets-premium-lp/atelier-action.jpg', null],
  ['Hero', 'calendrier.hero.photo2', 'Photo 2', 'assets-charte/cuisine-cafe.jpg', null],
  ['Hero', 'calendrier.hero.photo3', 'Photo 3', 'assets-premium-lp/sortie-four.jpg', null],
].map(([section, fieldKey, label, filePath, caption]) => ({ section, fieldKey, label, filePath, caption, sortOrder: next() }))

console.log(`→ ${TEXT.length} champs texte + ${IMAGE.length} champs photo (total ${TEXT.length + IMAGE.length})`)

for (const f of TEXT) {
  const { error } = await db
    .from('content_blocks')
    .upsert(
      {
        page: PAGE,
        section: f.section,
        field_key: f.fieldKey,
        field_type: 'text',
        label: f.label,
        text_value: f.value,
        sort_order: f.sortOrder,
      },
      { onConflict: 'page,field_key' },
    )
  if (error) {
    console.error(`❌ ${f.fieldKey} :`, error.message)
    process.exitCode = 1
  }
}
console.log(`✅ ${TEXT.length} champs texte insérés/mis à jour`)

const contentTypeFor = (ext) => (ext === 'png' ? 'image/png' : 'image/jpeg')

for (const f of IMAGE) {
  const extension = f.filePath.split('.').pop()
  const bytes = readFileSync(join(SITE_ROOT, f.filePath))
  const storagePath = `content/${PAGE}/${f.fieldKey}.${extension}`

  const { error: uploadError } = await db.storage
    .from('medias')
    .upload(storagePath, bytes, { contentType: contentTypeFor(extension), upsert: true })
  if (uploadError) {
    console.error(`❌ upload ${f.fieldKey} :`, uploadError.message)
    process.exitCode = 1
    continue
  }
  const { data: publicUrl } = db.storage.from('medias').getPublicUrl(storagePath)

  const { error } = await db
    .from('content_blocks')
    .upsert(
      {
        page: PAGE,
        section: f.section,
        field_key: f.fieldKey,
        field_type: 'image',
        label: f.label,
        image_path: publicUrl.publicUrl,
        image_caption: f.caption,
        sort_order: f.sortOrder,
      },
      { onConflict: 'page,field_key' },
    )
  if (error) {
    console.error(`❌ ${f.fieldKey} :`, error.message)
    process.exitCode = 1
  }
}
console.log(`✅ ${IMAGE.length} photos envoyées et enregistrées`)
