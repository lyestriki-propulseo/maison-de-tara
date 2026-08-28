// Sème les 32 champs de contenu éditable de la Boutique : texte tel quel (sans mise en forme,
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
  ['Hero', 'boutique.hero.titre1', 'Titre — ligne 1', 'La Boutique'],
  ['Hero', 'boutique.hero.titre2', 'Titre — ligne 2', 'de la Maison'],
  ['Hero', 'boutique.hero.texte1', 'Récit — premier paragraphe', "J'ai toujours aimé les maisons. Les maisons où l'on reçoit, où l'on prend le temps de dresser une jolie table, où les objets ont une histoire et où chaque détail participe à créer une atmosphère chaleureuse."],
  ['Hero', 'boutique.hero.texte2', 'Récit — second paragraphe', "C'est cette envie que l'on retrouve dans la boutique de la maison. Vous y trouverez une sélection de décoration, textiles, lampes, céramiques, art de la table et idées cadeaux choisis au fil de mes découvertes, de mes voyages et de mes coups de cœur."],

  ['Galerie', 'boutique.galerie.surtitre', 'Surtitre', 'Ce que vous trouverez'],
  ['Galerie', 'boutique.galerie.titre', 'Titre', 'Une sélection pour la maison.'],
  ['Galerie', 'boutique.galerie.01.titre', 'Vignette 01 — titre', 'Décoration'],
  ['Galerie', 'boutique.galerie.01.texte', 'Vignette 01 — texte', 'Des objets et pièces qui donnent du caractère et de la chaleur à un intérieur.'],
  ['Galerie', 'boutique.galerie.02.titre', 'Vignette 02 — titre', 'Textiles & block print'],
  ['Galerie', 'boutique.galerie.02.texte', 'Vignette 02 — texte', 'Imprimés à la main, belles matières et savoir-faire transmis de génération en génération.'],
  ['Galerie', 'boutique.galerie.03.titre', 'Vignette 03 — titre', 'Céramiques'],
  ['Galerie', 'boutique.galerie.03.texte', 'Vignette 03 — texte', "Des pièces fabriquées à la main ou imaginées par des artisans que j'admire."],
  ['Galerie', 'boutique.galerie.04.titre', 'Vignette 04 — titre', 'Lampes'],
  ['Galerie', 'boutique.galerie.04.texte', 'Vignette 04 — texte', "Pour réchauffer la lumière d'une pièce et créer une atmosphère."],
  ['Galerie', 'boutique.galerie.05.titre', 'Vignette 05 — titre', 'Art de la table'],
  ['Galerie', 'boutique.galerie.05.texte', 'Vignette 05 — texte', 'De quoi dresser une jolie table et recevoir comme on aime.'],
  ['Galerie', 'boutique.galerie.06.titre', 'Vignette 06 — titre', 'Idées cadeaux'],
  ['Galerie', 'boutique.galerie.06.texte', 'Vignette 06 — texte', 'Pour faire plaisir, ou se faire plaisir, au fil des saisons.'],

  ['Artisanat', 'boutique.artisanat.surtitre', 'Surtitre', 'fait main'],
  ['Artisanat', 'boutique.artisanat.titre', 'Titre', "L'artisanat, au cœur de la sélection"],
  ['Artisanat', 'boutique.artisanat.texte', 'Texte', "L'artisanat y occupe une place particulière. Le fait main, les belles matières, les imprimés block print et les savoir-faire transmis de génération en génération font partie de ce qui m'inspire depuis toujours. Chaque pièce a été choisie parce qu'elle apporte quelque chose à une maison\u00a0: de la chaleur, de la couleur, du caractère ou simplement du plaisir au quotidien."],

  ['Invitation finale', 'boutique.invitation.titre', 'Titre', 'Maison de Tara'],
  ['Invitation finale', 'boutique.invitation.texte1', 'Premier paragraphe', "La sélection évolue au fil des saisons, des rencontres et des nouvelles découvertes. Que vous cherchiez un cadeau, une pièce pour votre intérieur ou simplement un peu d'inspiration, j'espère que vous y trouverez quelque chose qui vous donnera envie de rentrer chez vous."],
  ['Invitation finale', 'boutique.invitation.texte2', 'Second paragraphe', "Aucune réservation n'est nécessaire pour découvrir la boutique. N'hésitez pas à pousser la porte pendant les horaires d'ouverture\u00a0: ce sera un plaisir de vous accueillir à la maison."],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'boutique.hero.photo', 'Photo — devanture', 'assets-charte/devanture-verte.jpg', 'comme à la maison — La Garenne-Colombes'],

  ['Galerie', 'boutique.galerie.01.photo', 'Vignette 01 — photo', 'assets-premium-lp/interior-palette.jpg', null],
  ['Galerie', 'boutique.galerie.02.photo', 'Vignette 02 — photo', 'assets-premium-lp/blockprint-marigold.jpg', null],
  ['Galerie', 'boutique.galerie.interlude.photo', 'Interlude — photo', 'assets-charte/interieur-vase.jpg', "au détour d'une pièce"],
  ['Galerie', 'boutique.galerie.03.photo', 'Vignette 03 — photo', 'assets-premium-lp/ceramique-details.jpg', null],
  ['Galerie', 'boutique.galerie.04.photo', 'Vignette 04 — photo', 'assets-charte/salon-terracotta.jpg', null],
  ['Galerie', 'boutique.galerie.05.photo', 'Vignette 05 — photo', 'assets-charte/boutique-plateaux.jpg', null],
  ['Galerie', 'boutique.galerie.06.photo', 'Vignette 06 — photo', 'assets-premium-lp/experience-04-recuperer.jpg', null],
  ['Galerie', 'boutique.galerie.accent.photo', 'Accent — photo', 'assets-charte/tasses-rayees.jpg', 'coup de cœur'],
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
