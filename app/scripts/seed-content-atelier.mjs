// Sème les 44 champs de contenu éditable de la page Atelier : texte tel quel (sans mise en
// forme, cf. décision produit) + photos actuelles du site uploadées dans le bucket Storage 'medias'.
// La grille de créneaux (jours/horaires de la section réservation) n'est PAS incluse : chantier
// séparé (lecture future depuis l'agenda de l'admin).
// Idempotent (upsert sur page+field_key) : peut être relancé sans dupliquer.
//   Usage : cd app && node scripts/seed-content-atelier.mjs
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

const PAGE = 'atelier'
let order = 0
const next = () => order++

const TEXT = [
  ['Hero', 'atelier.hero.eyebrow', 'Amorce', "L'atelier"],
  ['Hero', 'atelier.hero.titre', 'Titre', 'Peindre, à votre rythme'],
  ['Hero', 'atelier.hero.intro', 'Introduction', "Pas besoin de savoir peindre. On vous laisse essayer : choisissez une pièce en céramique, installez-vous, et laissez couler les idées pendant deux heures. On s'occupe du reste."],

  ['Intro rituel', 'atelier.rituel.eyebrow', 'Amorce', "Comment l'atelier va se dérouler"],
  ['Intro rituel', 'atelier.rituel.titre', 'Titre', 'Quatre étapes, tout en douceur.'],

  ['Chapitre 01 — Réserver', 'atelier.ch01.kicker', 'Kicker', 'premier geste'],
  ['Chapitre 01 — Réserver', 'atelier.ch01.titre', 'Titre', 'Réserver votre session'],
  ['Chapitre 01 — Réserver', 'atelier.ch01.texte', 'Texte (un paragraphe par ligne)', "Nous vous recommandons de réserver votre session à l'avance, afin de vous accueillir dans les meilleures conditions. Les réservations se font en ligne, par téléphone ou directement à la boutique.\nLes sessions durent environ deux heures. Nous vous conseillons d'arriver cinq à dix minutes avant votre créneau.\nVous pouvez venir avec quelques idées d'inspiration, des couleurs ou des motifs repérés sur Pinterest, mais rien n'est obligatoire.\nEt si c'est votre première fois, pas d'inquiétude : nous sommes là pour vous accompagner. Un livre d'inspiration imaginé par la maison est d'ailleurs à votre disposition."],
  ['Chapitre 01 — Réserver', 'atelier.ch01.marge', 'Note en marge', 'venez comme vous êtes'],

  ['Chapitre 02 — Peindre', 'atelier.ch02.kicker', 'Kicker', 'le pinceau à la main'],
  ['Chapitre 02 — Peindre', 'atelier.ch02.titre', 'Titre', 'Peindre à votre rythme'],
  ['Chapitre 02 — Peindre', 'atelier.ch02.texte', 'Texte (un paragraphe par ligne)', "Choisissez une ou plusieurs pièces parmi notre sélection de céramiques, puis laissez place à votre créativité. Seul, à deux, entre amis ou en famille, chacun crée à son rythme. Petits et grands sont les bienvenus.\nPeintures, pinceaux et accessoires sont fournis sur place, et la carte de la maison vous accompagne pendant la session : café, thé, boissons fraîches, douceurs, vins et apéritifs à partager.\nLe plus important ? Se faire plaisir.\nEt si votre pièce n'est pas terminée à la fin de la session, vous pourrez revenir la finir lors d'une prochaine visite."],
  ['Chapitre 02 — Peindre', 'atelier.ch02.marge', 'Note en marge', 'sans pression'],

  ['Chapitre 03 — Confier', 'atelier.ch03.kicker', 'Kicker', 'entre nos mains'],
  ['Chapitre 03 — Confier', 'atelier.ch03.titre', 'Titre', 'Nous confier votre pièce'],
  ['Chapitre 03 — Confier', 'atelier.ch03.texte', 'Texte (un paragraphe par ligne)', "Une fois votre pièce terminée, laissez-la entre nos mains. Pensez simplement à écrire vos initiales et la date sous votre création, et à la prendre en photo avant de partir.\nNous nous occupons ensuite de l'émaillage et de la cuisson, à plus de 1 000 °C.\nPetit détail important : les couleurs évoluent pendant la cuisson. La surprise fait partie de la magie."],
  ['Chapitre 03 — Confier', 'atelier.ch03.marge', 'Note en marge', 'la magie du four'],
  ['Chapitre 03 — Confier', 'atelier.ch03.note.label', 'Encadré — label', "note de l'atelier"],
  ['Chapitre 03 — Confier', 'atelier.ch03.note.intro', 'Encadré — intro', 'Le prix de votre pièce (entre 12 € et 80 € selon le modèle choisi) comprend :'],
  ['Chapitre 03 — Confier', 'atelier.ch03.note.items', 'Encadré — liste (une ligne par point)', 'la pièce en céramique\nles peintures et accessoires\nl\'émaillage\nla cuisson'],

  ['Chapitre 04 — Retrouver', 'atelier.ch04.kicker', 'Kicker', 'le retour à la maison'],
  ['Chapitre 04 — Retrouver', 'atelier.ch04.titre', 'Titre', 'Revenir la retrouver'],
  ['Chapitre 04 — Retrouver', 'atelier.ch04.texte', 'Texte (un paragraphe par ligne)', "Quelques jours plus tard, votre pièce vous attend à la maison, cuite et emballée avec soin.\nRésistante à l'eau et adaptée à un usage alimentaire, elle est prête à vivre chez vous.\nVous pouvez venir la récupérer pendant les horaires d'ouverture, à partir de la date convenue ensemble le jour de votre atelier."],
  ['Chapitre 04 — Retrouver', 'atelier.ch04.marge', 'Note en marge', 'emballée avec soin'],

  ['Réservation', 'atelier.reserve.eyebrow', 'Amorce', 'Réservation'],
  ['Réservation', 'atelier.reserve.titre', 'Titre', 'Réserver un moment.'],
  ['Réservation', 'atelier.reserve.acompte', 'Note acompte', "Un acompte de 6 € par personne est demandé pour confirmer la réservation. Il est déduit de votre facture finale, et le reste se règle sur place le jour de l'atelier."],
  ['Réservation', 'atelier.reserve.note8', 'Note au-delà de 8 personnes', 'Au-delà de 8 personnes, appelez-moi ou passez à la boutique : on organise ça ensemble.'],

  ['Privatisation', 'atelier.priva.titre', 'Titre', 'Privatisez la maison pour créer de beaux souvenirs'],
  ['Privatisation', 'atelier.priva.texte', 'Texte', 'Anniversaire, EVJF, team building, baby shower ou tout autre moment qui vous tient à cœur : nous imaginons ensemble la formule la plus adaptée à votre groupe. Pour toute demande de plus de 8 personnes, contactez-moi directement.'],
  ['Privatisation', 'atelier.priva.occasion1', 'Tag occasion 1', 'Anniversaire'],
  ['Privatisation', 'atelier.priva.occasion2', 'Tag occasion 2', 'EVJF'],
  ['Privatisation', 'atelier.priva.occasion3', 'Tag occasion 3', 'Team building'],
  ['Privatisation', 'atelier.priva.occasion4', 'Tag occasion 4', 'Baby shower'],
  ['Privatisation', 'atelier.priva.occasion5', 'Tag occasion 5', 'Événement privé'],
  ['Privatisation', 'atelier.priva.hint', 'Note sous la galerie', "photos d'événements à venir"],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'atelier.hero.photo', 'Photo', 'assets-premium-lp/experience-02-installer.jpg', 'deux heures pour soi'],

  ['Chapitre 01 — Réserver', 'atelier.ch01.photo', 'Photo', 'assets-premium-lp/experience-01-choisir.jpg', null],
  ['Chapitre 02 — Peindre', 'atelier.ch02.photo', 'Photo', 'assets-premium-lp/experience-03-peindre.jpg', null],
  ['Chapitre 03 — Confier', 'atelier.ch03.photo', 'Photo', 'assets-premium-lp/sortie-four.jpg', null],
  ['Chapitre 04 — Retrouver', 'atelier.ch04.photo', 'Photo', 'assets-premium-lp/experience-04-recuperer.jpg', null],

  ['Privatisation', 'atelier.priva.photo1', 'Photo 1', 'assets-premium-lp/atelier-action.jpg', null],
  ['Privatisation', 'atelier.priva.photo2', 'Photo 2', 'assets-premium-lp/ceramique-details.jpg', null],
  ['Privatisation', 'atelier.priva.photo3', 'Photo 3', 'assets-charte/cuisine-cafe.jpg', null],
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
