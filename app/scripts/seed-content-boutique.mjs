// ⚠️ Écrase le contenu saisi par Tara. Ne relancer que sur une base vide.
// Sème les champs de contenu éditable de la Boutique : texte tel quel (sans mise en forme,
// cf. décision produit) + photos actuelles du site uploadées dans le bucket Storage 'medias'.
// Idempotent (upsert sur page+field_key) : peut être relancé sans dupliquer.
//   Usage : cd app && node scripts/seed-content-boutique.mjs
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

const PAGE = 'boutique'
let order = 0
const next = () => order++

const TEXT = [
  ["Hero", "boutique.hero.titre1", "Titre — ligne 1", "La Boutique"],
  ["Hero", "boutique.hero.titre2", "Titre — ligne 2", "de la Maison"],
  ["Hero", "boutique.hero.texte1", "Récit — premier paragraphe", "J'ai toujours aimé les maisons. Celles où l'on reçoit, où l'on prend le temps de dresser une jolie table, où les objets ont une histoire et où chaque détail participe à créer une atmosphère chaleureuse."],
  ["Hero", "boutique.hero.texte2", "Récit — second paragraphe", "C'est cette envie que l'on retrouve dans la boutique de la maison. Vous y trouverez une sélection de décoration, textiles, lampes, céramiques, art de la table et idées cadeaux choisis au fil de mes découvertes, de mes voyages et de mes coups de cœur."],

  ["Galerie", "boutique.galerie.surtitre", "Surtitre", "Ce que vous trouverez"],
  ["Galerie", "boutique.galerie.titre", "Titre", "Une sélection pour la maison."],
  ["Galerie", "boutique.galerie.01.titre", "Vignette 01 — titre", "Décoration & Art de la table"],
  ["Galerie", "boutique.galerie.01.texte", "Vignette 01 — texte", "Des objets choisis pour apporter du caractère, de la couleur et une histoire à la maison."],
  ["Galerie", "boutique.galerie.02.titre", "Vignette 02 — titre", "Textiles & Block print"],
  ["Galerie", "boutique.galerie.02.texte", "Vignette 02 — texte", "Des textiles aux motifs, couleurs et imprimés qui font écho à mes racines indiennes et à mon goût pour le block print. Pour habiller une table, un canapé ou simplement apporter de la couleur à la maison."],
  ["Galerie", "boutique.galerie.03.titre", "Vignette 03 — titre", "Céramiques"],
  ["Galerie", "boutique.galerie.03.texte", "Vignette 03 — texte", "Des céramiques choisies pour leurs formes, leurs couleurs et leurs détails. Des pièces à utiliser au quotidien ou simplement à aimer regarder."],
  ["Galerie", "boutique.galerie.04.titre", "Vignette 04 — titre", "Papeterie & idées cadeaux"],
  ["Galerie", "boutique.galerie.04.texte", "Vignette 04 — texte", "Des carnets, cartes, petits objets et jolies attentions à offrir à quelqu’un… ou à s’offrir tout simplement."],
  ["Galerie", "boutique.galerie.05.titre", "Vignette 05 — titre", null],
  ["Galerie", "boutique.galerie.05.texte", "Vignette 05 — texte", null],
  ["Galerie", "boutique.galerie.06.titre", "Vignette 06 — titre", null],
  ["Galerie", "boutique.galerie.06.texte", "Vignette 06 — texte", null],

  ["Artisanat", "boutique.artisanat.surtitre", "Surtitre", "fait main"],
  ["Artisanat", "boutique.artisanat.titre", "Titre", "L'artisanat, au cœur de la sélection"],
  ["Artisanat", "boutique.artisanat.texte", "Texte", "L’artisanat, le fait main, les belles matières, les couleurs et les savoir-faire m’inspirent depuis toujours. Mais surtout, chaque objet de la boutique est là parce que je l’aime et que je pourrais l’imaginer chez moi."],

  ["Invitation finale", "boutique.invitation.titre", "Titre", "Maison de Tara"],
  ["Invitation finale", "boutique.invitation.texte1", "Premier paragraphe", "La sélection évoluera au fil des saisons, des rencontres et de mes découvertes. Des objets pour la maison, des idées à offrir, parfois des pièces inattendues… toujours avec du caractère et un peu de joie au quotidien."],
  ["Invitation finale", "boutique.invitation.texte2", "Second paragraphe", "Aucune réservation n’est nécessaire pour découvrir la boutique. Poussez simplement la porte pendant les horaires d’ouverture : ce sera un plaisir de vous accueillir à la Maison."],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'boutique.hero.photo', 'Photo — devanture', 'assets-premium-lp/storefront.jpg', 'comme à la maison — La Garenne-Colombes'],

  ['Galerie', 'boutique.galerie.01.photo', 'Vignette 01 — photo', 'assets-charte/interieur-vase.jpg', null],
  ['Galerie', 'boutique.galerie.02.photo', 'Vignette 02 — photo', 'assets-premium-lp/blockprint-marigold.jpg', null],
  ['Galerie', 'boutique.galerie.03.photo', 'Vignette 03 — photo', 'assets-premium-lp/ceramique-details.jpg', null],
  ['Galerie', 'boutique.galerie.04.photo', 'Vignette 04 — photo', 'assets-charte/tasses-rayees.jpg', null],
  ['Galerie', 'boutique.galerie.05.photo', 'Vignette 05 — photo', 'assets-charte/boutique-plateaux.jpg', null],
  ['Galerie', 'boutique.galerie.06.photo', 'Vignette 06 — photo', 'assets-charte/salon-terracotta.jpg', null],
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
