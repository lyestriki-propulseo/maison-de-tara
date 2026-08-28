// Sème les 33 champs de contenu éditable de la page Contact : texte tel quel (sans mise en forme,
// cf. décision produit) + la photo de devanture actuelle du site uploadée dans le bucket Storage 'medias'.
// Exclusions volontaires (décidées avec Lyes) : la FAQ #10 (réponse avec liens calendrier/Instagram,
// non éditable), la grille horaires "Ateliers (sessions de 2h)" (chantier séparé, lecture agenda),
// les coordonnées (adresse/tél/email/Instagram) et "Ouverture de la maison" (déjà géré par /admin/horaires).
// Idempotent (upsert sur page+field_key) : peut être relancé sans dupliquer.
//   Usage : cd app && node scripts/seed-content-contact.mjs
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

const PAGE = 'contact'
let order = 0
const next = () => order++

const TEXT = [
  ['Hero', 'contact.hero.eyebrow', 'Amorce', 'Une question ?'],
  ['Hero', 'contact.hero.titre', 'Titre', 'Venir à la maison'],
  ['Hero', 'contact.hero.intro', 'Introduction', 'La maison vous accueille au 1 Rue Gabriel Péri, à La Garenne-Colombes. Boutique, café ou atelier, on vous reçoit comme à la maison.'],

  ['Comment venir', 'contact.acces.train.titre', 'Train — titre', 'En train'],
  ['Comment venir', 'contact.acces.train.texte', 'Train — texte', 'À quelques minutes à pied de la gare de La Garenne-Colombes, facilement accessible depuis Paris Saint-Lazare (Ligne L).'],
  ['Comment venir', 'contact.acces.tramway.titre', 'Tramway — titre', 'En tramway'],
  ['Comment venir', 'contact.acces.tramway.texte', 'Tramway — texte', 'À proximité du T2 « Les Fauvelles », reliant La Défense et Porte de Versailles.'],
  ['Comment venir', 'contact.acces.bus.titre', 'Bus — titre', 'En bus'],
  ['Comment venir', 'contact.acces.bus.texte', 'Bus — texte', 'Desservie par les lignes 163, 164, 178 et 278, avec des arrêts à proximité (Colombes, Courbevoie, Bois-Colombes, La Défense).'],
  ['Comment venir', 'contact.acces.voiture.titre', 'Voiture — titre', 'En voiture'],
  ['Comment venir', 'contact.acces.voiture.texte', 'Voiture — texte', 'Plusieurs places de stationnement dans les rues avoisinantes. Un parking public payant est également accessible à proximité.'],

  ['FAQ', 'contact.faq.q1.question', 'Question 1', 'Faut-il savoir peindre ?'],
  ['FAQ', 'contact.faq.q1.reponse', 'Réponse 1', "Non, aucune expérience n'est nécessaire. On vous laisse essayer, à votre rythme."],
  ['FAQ', 'contact.faq.q2.question', 'Question 2', 'Combien de temps dure une session ?'],
  ['FAQ', 'contact.faq.q2.reponse', 'Réponse 2', 'Environ 2 heures.'],
  ['FAQ', 'contact.faq.q3.question', 'Question 3', 'Quand récupérer ma pièce ?'],
  ['FAQ', 'contact.faq.q3.reponse', 'Réponse 3', 'Quelques jours après la cuisson. Nous conviendrons ensemble de la date estimée de récupération le jour de votre atelier.'],
  ['FAQ', 'contact.faq.q4.question', 'Question 4', 'À partir de quel âge ?'],
  ['FAQ', 'contact.faq.q4.reponse', 'Réponse 4', "Il n'y a pas d'âge pour peindre ! Les plus jeunes sont bien sûr les bienvenus lorsqu'ils sont accompagnés d'un adulte."],
  ['FAQ', 'contact.faq.q5.question', 'Question 5', 'Dois-je réserver pour un atelier ?'],
  ['FAQ', 'contact.faq.q5.reponse', 'Réponse 5', "Oui, nous vous recommandons de réserver votre session à l'avance afin de vous accueillir dans les meilleures conditions et vous garantir une place. Les réservations se font en ligne, par téléphone ou directement à la boutique, sous réserve des disponibilités."],
  ['FAQ', 'contact.faq.q6.question', 'Question 6', 'Combien coûte un atelier ?'],
  ['FAQ', 'contact.faq.q6.reponse', 'Réponse 6', "Le prix dépend de la pièce que vous choisissez : comptez entre 12 € et 80 € selon le modèle. Il comprend tout : la pièce en céramique, les peintures et accessoires, l'émaillage et la cuisson."],
  ['FAQ', 'contact.faq.q7.question', 'Question 7', "Dois-je payer mon atelier à l'avance ?"],
  ['FAQ', 'contact.faq.q7.reponse', 'Réponse 7', "Non, le règlement s'effectue sur place le jour de votre atelier. Lors de la réservation, un acompte de 6 € par personne est demandé pour confirmer votre place ; il est déduit de votre facture finale. Cette participation nous permet de limiter les absences de dernière minute."],
  ['FAQ', 'contact.faq.q8.question', 'Question 8', 'Puis-je aussi découvrir la boutique ?'],
  ['FAQ', 'contact.faq.q8.reponse', 'Réponse 8', 'Avec plaisir ! Vous pouvez passer librement, sans réservation, pendant les horaires d\'ouverture. Vous y trouverez une sélection de décoration, textiles, céramiques et idées cadeaux, renouvelée au fil des saisons.'],
  ['FAQ', 'contact.faq.q9.question', 'Question 9', 'Puis-je organiser un anniversaire, un EVJF, un team building ?'],
  ['FAQ', 'contact.faq.q9.reponse', 'Réponse 9', 'Bien sûr. Nous serions ravis de vous accueillir pour célébrer un anniversaire, un EVJF, un team building, une baby shower ou tout autre moment qui vous tient à cœur. Pour toute réservation de plus de 8 personnes, contactez-nous directement pour imaginer ensemble la formule la plus adaptée.'],

  ['Écrivez-nous', 'contact.ecrire.kicker', 'Amorce', 'Écrivez-nous'],
  ['Écrivez-nous', 'contact.ecrire.titre', 'Titre', 'Une question ? Un projet ?'],
  ['Écrivez-nous', 'contact.ecrire.texte', 'Introduction', "On vous répond avec plaisir. Pour une réservation d'atelier, passez plutôt par la page Atelier."],
].map(([section, fieldKey, label, value]) => ({ section, fieldKey, label, value, sortOrder: next() }))

const IMAGE = [
  ['Hero', 'contact.hero.photo', 'Photo de devanture', 'assets-premium-lp/tara-storefront-01.jpeg', null],
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
