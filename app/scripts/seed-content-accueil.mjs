// Sème les 65 champs de contenu éditable de l'Accueil (page pilote) : texte tel quel (sans mise en
// forme, cf. décision produit) + photos actuelles du site uploadées dans le bucket Storage 'medias'.
// Idempotent (upsert sur page+field_key) : peut être relancé sans dupliquer.
//   Usage : cd app && node scripts/seed-content-accueil.mjs
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

const PAGE = 'accueil'
let order = 0
const next = () => order++

const TEXT = [
  ['Hero', 'accueil.hero.eyebrow', 'Amorce', 'La Garenne-Colombes · Ouverture Automne 2026'],
  ['Hero', 'accueil.hero.titre', 'Titre', 'Bienvenue à la Maison de Tara'],
  ['Hero', 'accueil.hero.intro', 'Introduction', "Peinture sur céramique, café et décoration pour la maison. Un lieu inspiré de l'artisanat, du fait main et du plaisir de recevoir."],
  ['Hero', 'accueil.hero.meta1', 'Repère lieu', 'La Garenne-Colombes · Hauts-de-Seine (92)'],
  ['Hero', 'accueil.hero.meta2', 'Repère activité', 'Peinture sur céramique · café · boutique déco maison'],

  ['Les 3 cartes', 'accueil.univers.titre', 'Titre de section', 'À découvrir à la maison'],
  ['Les 3 cartes', 'accueil.univers.atelier.badge', 'Atelier — badge', "L'Atelier · sessions de 2h"],
  ['Les 3 cartes', 'accueil.univers.atelier.titre', 'Atelier — titre', "L'envie de créer"],
  ['Les 3 cartes', 'accueil.univers.atelier.texte', 'Atelier — texte', 'Choisissez une pièce parmi notre sélection de céramiques, installez-vous et prenez le temps de la personnaliser à votre façon.'],
  ['Les 3 cartes', 'accueil.univers.atelier.points', 'Atelier — points clés (une ligne par point)', 'Environ 2 heures, seul, entre amis ou en famille\nInspirations à disposition, accompagnement si besoin\nÉmaillée et cuite à 1000 °C, à retrouver quelques jours plus tard'],
  ['Les 3 cartes', 'accueil.univers.boutique.badge', 'Boutique — badge', 'La Boutique'],
  ['Les 3 cartes', 'accueil.univers.boutique.titre', 'Boutique — titre', 'Une sélection pour la maison'],
  ['Les 3 cartes', 'accueil.univers.boutique.texte', 'Boutique — texte', 'À la Maison de Tara, vous trouverez une sélection de textiles, céramiques, lampes, art de la table et idées cadeaux choisis avec soin.'],
  ['Les 3 cartes', 'accueil.univers.boutique.points', 'Boutique — points clés (une ligne par point)', 'Artisanat et fait main : chaleureux, vivant, plein de personnalité\nUne sélection qui évolue au fil des saisons et des coups de cœur'],
  ['Les 3 cartes', 'accueil.univers.cafe.badge', 'Café — badge', 'Le Café · sans réservation'],
  ['Les 3 cartes', 'accueil.univers.cafe.titre', 'Café — titre', 'Pour accompagner le moment'],
  ['Les 3 cartes', 'accueil.univers.cafe.texte', 'Café — texte', 'Café de spécialité, thés, boissons fraîches, douceurs, vins et apéritifs à partager.'],
  ['Les 3 cartes', 'accueil.univers.cafe.points', 'Café — points clés (une ligne par point)', 'Tout au long de la journée\nPendant votre session ou simplement de passage'],

  ['Le parcours', 'accueil.parcours.label', 'Label', 'Le parcours'],
  ['Le parcours', 'accueil.parcours.titre', 'Titre', "Comment l'atelier va se dérouler ?"],
  ['Le parcours', 'accueil.parcours.soustitre', 'Sous-titre', 'Quatre étapes simples, depuis votre arrivée jusqu\'au retour chez vous avec votre pièce.'],
  ['Le parcours', 'accueil.parcours.01.titre', 'Étape 01 — titre', 'Réserver votre session'],
  ['Le parcours', 'accueil.parcours.01.texte', 'Étape 01 — texte', "Réservez à l'avance, en ligne, par téléphone ou directement à la boutique. Les sessions durent environ 2 heures, pensez à arriver quelques minutes avant votre créneau. Et si c'est votre première fois, pas d'inquiétude : on est là pour vous accompagner."],
  ['Le parcours', 'accueil.parcours.02.titre', 'Étape 02 — titre', 'Peindre à votre rythme'],
  ['Le parcours', 'accueil.parcours.02.texte', 'Étape 02 — texte', 'Choisissez votre pièce parmi notre sélection de céramiques. Peintures, pinceaux et accessoires sont à disposition, et la carte de la maison vous accompagne. Le plus important ? Se faire plaisir.'],
  ['Le parcours', 'accueil.parcours.03.titre', 'Étape 03 — titre', 'Nous confier votre pièce'],
  ['Le parcours', 'accueil.parcours.03.texte', 'Étape 03 — texte', "Une fois votre pièce terminée, écrivez vos initiales et la date dessous, prenez-la en photo, puis laissez-la entre nos mains. Nous nous occupons de l'émaillage et de la cuisson à plus de 1 000 °C. Les couleurs évoluent pendant la cuisson : la surprise fait partie de la magie."],
  ['Le parcours', 'accueil.parcours.04.titre', 'Étape 04 — titre', 'Revenir la retrouver'],
  ['Le parcours', 'accueil.parcours.04.texte', 'Étape 04 — texte', "Quelques jours plus tard, votre pièce vous attend à la maison, cuite et emballée avec soin. Résistante à l'eau et compatible avec une utilisation alimentaire, elle est prête à vivre chez vous."],

  ['Certaines réalisations', 'accueil.realisations.label', 'Label', 'Sorties de four'],
  ['Certaines réalisations', 'accueil.realisations.titre', 'Titre', 'Certaines réalisations'],

  ['Passer à la maison', 'accueil.boutique.label', 'Label', 'La boutique'],
  ['Passer à la maison', 'accueil.boutique.titre', 'Titre', 'Passer à la maison'],
  ['Passer à la maison', 'accueil.boutique.texte', 'Texte', "Pas besoin de réservation pour venir découvrir la boutique. Passez pendant les horaires d'ouverture pour explorer la sélection : textiles, céramiques, lampes, objets, et même une partie papeterie choisis avec soin."],

  ['Les rendez-vous de la Maison', 'accueil.calendrier.label', 'Label', 'À venir'],
  ['Les rendez-vous de la Maison', 'accueil.calendrier.titre', 'Titre', 'Les rendez-vous de la Maison'],

  ['Les grandes occasions', 'accueil.occasions.label', 'Label', 'Privatisation'],
  ['Les grandes occasions', 'accueil.occasions.titre', 'Titre', 'Les grandes occasions'],
  ['Les grandes occasions', 'accueil.occasions.soustitre', 'Sous-titre', 'Anniversaire, EVJF, team building, baby shower ou tout autre moment qui vous tient à cœur : nous imaginons ensemble la formule la plus adaptée à votre groupe.'],
  ['Les grandes occasions', 'accueil.occasions.note', 'Note', 'Au-delà de 8 personnes, appelez-nous ou passez à la boutique : on organise ça ensemble.'],

  ['Newsletter', 'accueil.newsletter.label', 'Label', 'La lettre de la maison'],
  ['Newsletter', 'accueil.newsletter.titre', 'Titre', 'Recevez les nouvelles de la maison une fois par mois.'],
  ['Newsletter', 'accueil.newsletter.texte', 'Texte', 'Ateliers à venir, événements, nouveautés de la boutique et quelques mots de Tara.'],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'accueil.hero.photo', 'Photo', 'assets-charte/tasses-rayees.jpg', null],

  ['Les 3 cartes', 'accueil.univers.atelier.photo', 'Atelier — photo', 'assets-premium-lp/experience-01-choisir.jpg', null],
  ['Les 3 cartes', 'accueil.univers.boutique.photo', 'Boutique — photo', 'assets-premium-lp/boutique-unsplash.jpg', null],
  ['Les 3 cartes', 'accueil.univers.cafe.photo', 'Café — photo', 'assets-premium-lp/cafe-pexels.jpg', null],

  ['Le parcours', 'accueil.parcours.01.photo', 'Étape 01 — photo', 'assets-premium-lp/experience-02-installer.jpg', null],
  ['Le parcours', 'accueil.parcours.02.photo', 'Étape 02 — photo', 'assets-premium-lp/experience-03-peindre.jpg', null],
  ['Le parcours', 'accueil.parcours.03.photo', 'Étape 03 — photo', 'assets-premium-lp/experience-01-choisir.jpg', null],
  ['Le parcours', 'accueil.parcours.04.photo', 'Étape 04 — photo', 'assets-premium-lp/experience-04-recuperer.jpg', null],

  ['Certaines réalisations', 'accueil.realisations.photo1', 'Photo 1', 'assets-premium-lp/atelier-action.jpg', null],
  ['Certaines réalisations', 'accueil.realisations.photo2', 'Photo 2', 'assets-premium-lp/sortie-four.jpg', null],
  ['Certaines réalisations', 'accueil.realisations.photo3', 'Photo 3', 'assets-premium-lp/cafe-pexels.jpg', null],
  ['Certaines réalisations', 'accueil.realisations.photo4', 'Photo 4', 'assets-premium-lp/ceramique-details.jpg', null],
  ['Certaines réalisations', 'accueil.realisations.photo5', 'Photo 5', 'assets-premium-lp/blockprint-textile.jpg', null],
  ['Certaines réalisations', 'accueil.realisations.photo6', 'Photo 6', 'assets-premium-lp/atelier-action.jpg', null],

  ['Passer à la maison', 'accueil.boutique.photo1', 'Photo 1', 'assets-charte/tasses-rayees.jpg', null],
  ['Passer à la maison', 'accueil.boutique.photo2', 'Photo 2', 'assets-charte/boutique-plateaux.jpg', null],
  ['Passer à la maison', 'accueil.boutique.photo3', 'Photo 3', 'assets-charte/interieur-vase.jpg', null],

  ['Les grandes occasions', 'accueil.occasions.photo1', 'Photo — Anniversaire', 'assets-premium-lp/atelier-action.jpg', 'Anniversaire'],
  ['Les grandes occasions', 'accueil.occasions.photo2', 'Photo — EVJF', 'assets-premium-lp/experience-03-peindre.jpg', 'EVJF'],
  ['Les grandes occasions', 'accueil.occasions.photo3', 'Photo — Team building', 'assets-premium-lp/experience-01-choisir.jpg', 'Team building'],
  ['Les grandes occasions', 'accueil.occasions.photo4', 'Photo — Baby shower', 'assets-charte/salon-terracotta.jpg', 'Baby shower'],
  ['Les grandes occasions', 'accueil.occasions.photo5', 'Photo — Autres événements', 'assets-premium-lp/cafe-pexels.jpg', 'Autres événements'],
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
