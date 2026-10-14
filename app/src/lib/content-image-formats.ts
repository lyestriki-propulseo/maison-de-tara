// Forme de chaque emplacement photo du site (US-003), pour que l'aperçu de cadrage de l'admin
// montre exactement ce que le site affichera. Mesurée le 14/10/2026 dans un navigateur à 1440 × 900
// (référence de l'US) : rapport largeur / hauteur de la zone où la photo est peinte (sans liseré ni
// marge intérieure) ; `arch` = haut en demi-cercle. Déclarée ici et non en base : les photos naissent
// des scripts app/scripts/seed-content-*.mjs. Si le CSS du site change la forme d'un emplacement,
// mettre à jour cette table.

export type ImageFormat = { ratio: number; arch: boolean }

const DEFAULT_FORMAT: ImageFormat = { ratio: 1.6, arch: false }

const arch = (ratio: number): ImageFormat => ({ ratio, arch: true })
const rect = (ratio: number): ImageFormat => ({ ratio, arch: false })

export const IMAGE_FORMATS: Record<string, ImageFormat> = {
  'accueil.hero.photo': rect(1.016),
  'accueil.univers.atelier.photo': arch(1.502),
  'accueil.univers.boutique.photo': arch(1.502),
  'accueil.univers.cafe.photo': arch(1.502),
  'accueil.parcours.01.photo': arch(0.957),
  'accueil.parcours.02.photo': arch(0.957),
  'accueil.parcours.03.photo': arch(0.957),
  'accueil.parcours.04.photo': arch(0.957),
  'accueil.boutique.photo1': rect(0.8),
  'accueil.boutique.photo2': rect(0.8),
  'accueil.boutique.photo3': rect(0.8),
  'accueil.occasions.photo1': arch(1.268),
  'accueil.occasions.photo2': arch(1.268),
  'accueil.occasions.photo3': arch(1.268),
  'accueil.occasions.photo4': arch(1.268),
  'accueil.occasions.photo5': arch(1.268),
  'atelier.hero.photo': arch(0.793),
  'atelier.ch01.photo': arch(0.741),
  'atelier.ch02.photo': arch(0.741),
  'atelier.ch03.photo': arch(0.741),
  'atelier.ch04.photo': arch(0.741),
  'atelier.priva.photo1': arch(0.733),
  'atelier.priva.photo2': arch(0.733),
  'atelier.priva.photo3': arch(0.733),
  'boutique.hero.photo': rect(1.333),
  'boutique.galerie.01.photo': arch(0.732),
  'boutique.galerie.02.photo': rect(1.6),
  'boutique.galerie.03.photo': rect(0.75),
  'boutique.galerie.04.photo': rect(1.6),
  'boutique.galerie.05.photo': rect(0.75),
  'boutique.galerie.06.photo': rect(1.6),
  'calendrier.hero.photo1': arch(0.849),
  'calendrier.hero.photo2': arch(0.849),
  'calendrier.hero.photo3': arch(0.849),
  'contact.hero.photo': rect(0.749),
  'histoire.hero.photo_inde': arch(0.715),
  'histoire.hero.photo_france': rect(1.359),
  'histoire.recit.photo1': arch(0.883),
  'histoire.recit.photo2': arch(0.883),
  'histoire.recit.photo3': rect(2.291),
}

export function imageFormat(fieldKey: string): ImageFormat {
  return IMAGE_FORMATS[fieldKey] ?? DEFAULT_FORMAT
}

// Section « Certaines réalisations » de l'accueil : masquée sur le site (index.html), donc ses
// photos n'ont aucun emplacement visible et ne sont pas proposées dans Contenu.
const HIDDEN_PREFIXES = ['accueil.realisations.']

export function isHiddenContentKey(fieldKey: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => fieldKey.startsWith(prefix))
}
