// Sème les 13 champs de contenu éditable de la page Histoire : texte tel quel (sans mise en forme,
// cf. décision produit) + photos actuelles du site uploadées dans le bucket Storage 'medias'.
// Idempotent (upsert sur page+field_key) : peut être relancé sans dupliquer.
//   Usage : cd app && node scripts/seed-content-histoire.mjs
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

const PAGE = 'histoire'
let order = 0
const next = () => order++

const TEXT = [
  ['Hero', 'histoire.hero.eyebrow', 'Amorce', 'Mon histoire'],
  ['Hero', 'histoire.hero.titre', 'Titre', 'Entre l’Inde et la France'],
  ['Hero', 'histoire.hero.texte', 'Chapô', 'Une lettre de Tara, à lire comme on s’installe : en prenant le temps.'],

  ['La lettre', 'histoire.recit.partie1', 'Récit — partie 1 : racines indiennes (un paragraphe par ligne)', 'Maison de Tara est née bien avant d’avoir une adresse.\nElle est née dans les maisons que j’ai connues enfant, en Inde. Des maisons où l’on recevait beaucoup, où les tissus, les couleurs, les odeurs de cuisine et les objets racontaient toujours une histoire.\nJ’y ai découvert le plaisir de créer, d’accueillir et de prendre le temps. Le goût du fait main, de l’artisanat et des choses que l’on garde longtemps.'],
  ['La lettre', 'histoire.recit.partie2', 'Récit — partie 2 : Australie, France, l’envie (un paragraphe par ligne)', 'Plus tard, mes études en Australie m’ont ouvert à d’autres cultures, d’autres façons de vivre et d’autres manières de recevoir. Une curiosité qui ne m’a jamais quittée.\nPuis la vie m’a menée en France. J’y ai construit notre vie de famille, aux côtés de mon mari et de nos trois enfants. J’y ai également passé près de 18 ans dans un univers professionnel très différent. Mais avec toujours cette envie de créer un jour un lieu qui me ressemble.\nPendant longtemps, cette idée est restée un rêve.\nEt puis un jour, l’envie est devenue plus forte que les hésitations. J’ai décidé de me donner une chance. Et de transformer une idée qui m’accompagnait depuis des années en quelque chose de réel.'],
  ['La lettre', 'histoire.recit.partie3', 'Récit — partie 3 : naissance du lieu, conclusion (un paragraphe par ligne)', 'J’avais envie d’un lieu vivant. Un lieu où l’on se sent bien dès que l’on pousse la porte. Où l’on crée quelque chose avec ses mains, où l’on partage un café, où l’on découvre de belles choses pour la maison et où l’on prend simplement le temps.\nC’est ainsi qu’est née Maison de Tara.\nUne maison inspirée de mes racines indiennes, de ma vie en France, de mon amour pour l’artisanat, les belles tables et les moments partagés.\nJ’espère que vous vous sentirez ici comme je me suis toujours sentie dans les maisons que j’ai aimées : accueilli, inspiré et libre d’être simplement vous-même.\nBienvenue à la maison.'],
  ['La lettre', 'histoire.recit.signature', 'Signature', 'Tara'],

  ['Sortie de page', 'histoire.envoi.texte', 'Phrase de clôture', 'Envie de venir écrire la suite ?'],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'histoire.hero.photo_inde', 'Photo — l’Inde', 'assets-premium-lp/blockprint-marigold.jpg', null],
  ['Hero', 'histoire.hero.photo_france', 'Photo — la France', 'assets-premium-lp/tara-storefront-01.jpeg', null],

  ['La lettre', 'histoire.recit.photo1', 'Photo — tissus, motifs, gestes transmis', 'assets-premium-lp/blockprint-green.jpg', 'tissus, motifs, gestes transmis'],
  ['La lettre', 'histoire.recit.photo2', 'Photo — la maison, côté objets', 'assets-charte/interieur-vase.jpg', 'la maison, côté objets'],
  ['La lettre', 'histoire.recit.photo3', 'Photo — un café, un peu plus longtemps', 'assets-charte/cuisine-cafe.jpg', 'un café, un peu plus longtemps'],
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
