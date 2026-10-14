// Cadrage des photos éditables (US-003) : un zoom et un point de focus (0-100 %, sens CSS
// object-position). Zoom relatif à « la photo remplit le cadre » (1 = 100 %), jusqu'à 3 ; sous 1,
// la photo laisse une bande remplie d'une couleur (v2), sans jamais descendre sous « Photo
// entière » ; 0 = mode « Photo entière », recalculé pour chaque forme de cadre. Rendu = fond
// « cover × zoom » positionné au focus : le point à x % du cadre montre le point à x % de la photo.
// Le site en garde une copie en JS (js/image-zoom.js, dépôt du site), testée sur les mêmes cas :
// toute modification se reporte des deux côtés.

export const ZOOM_WHOLE = 0
export const ZOOM_MAX = 3
export const ZOOM_STEP = 0.1
/** Crème du site : remplissage quand la couleur des bords ne peut pas être calculée. */
export const FILL_FALLBACK = '#fbf7ec'

const round2 = (value: number) => Math.round(value * 100) / 100

/** Zoom enregistré : 0 (« Photo entière ») à 3 ; valeur invalide = 100 % (lignes d'avant v2). */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(ZOOM_MAX, Math.max(ZOOM_WHOLE, zoom))
}

/** Plus petit zoom où toute la photo tient dans le rectangle du cadre (≤ 1). */
export function wholeZoom(imageRatio: number, frameRatio: number): number {
  return imageRatio >= frameRatio ? frameRatio / imageRatio : imageRatio / frameRatio
}

/** Zoom réellement affiché pour cette forme de cadre : jamais sous « Photo entière ». */
export function effectiveZoom(zoom: number, imageRatio: number, frameRatio: number): number {
  const whole = wholeZoom(imageRatio, frameRatio)
  const value = clampZoom(zoom)
  return value === ZOOM_WHOLE ? whole : Math.max(whole, value)
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/** Valeur CSS background-size : la photo couvre le cadre, puis est agrandie (ou réduite) du zoom. */
export function zoomBackgroundSize(imageRatio: number, frameRatio: number, zoom: number): string {
  const percent = `${round2(effectiveZoom(zoom, imageRatio, frameRatio) * 100)}%`
  // Photo plus « large » que le cadre : la hauteur sert de référence (et inversement).
  return imageRatio >= frameRatio ? `auto ${percent}` : `${percent} auto`
}

type Framing = {
  imageWidth: number
  imageHeight: number
  frameWidth: number
  frameHeight: number
  zoom: number
}

function displayedSize({ imageWidth, imageHeight, frameWidth, frameHeight, zoom }: Framing) {
  const shown = effectiveZoom(zoom, imageWidth / imageHeight, frameWidth / frameHeight)
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * shown
  return { width: imageWidth * scale, height: imageHeight * scale }
}

/**
 * Zone de la photo visible dans le cadre, en fractions (0-1) de la photo. Sous 100 %, elle déborde
 * de la photo (valeurs < 0 ou > 1) : c'est la bande remplie de couleur.
 */
export function visibleArea(framing: Framing & { focusX: number; focusY: number }) {
  const shown = displayedSize(framing)
  const offsetX = (framing.frameWidth - shown.width) * (clampPercent(framing.focusX) / 100)
  const offsetY = (framing.frameHeight - shown.height) * (clampPercent(framing.focusY) / 100)
  return {
    left: -offsetX / shown.width,
    top: -offsetY / shown.height,
    width: framing.frameWidth / shown.width,
    height: framing.frameHeight / shown.height,
  }
}

/** Nouveau focus après un glisser de (dx, dy) pixels : la photo suit le pointeur. */
export function focusAfterDrag(
  framing: Framing & { focusX: number; focusY: number; dx: number; dy: number },
): { x: number; y: number } {
  const shown = displayedSize(framing)
  // Marge de déplacement : négative si la photo dépasse du cadre, positive si elle laisse une bande.
  const slackX = framing.frameWidth - shown.width
  const slackY = framing.frameHeight - shown.height
  const x = Math.abs(slackX) > 0.5 ? framing.focusX + (framing.dx / slackX) * 100 : framing.focusX
  const y = Math.abs(slackY) > 0.5 ? framing.focusY + (framing.dy / slackY) * 100 : framing.focusY
  return { x: round2(clampPercent(x)), y: round2(clampPercent(y)) }
}

const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

/**
 * Couleur de remplissage (CA-08) : moyenne des pixels d'une bande de 2 % (au moins 1 px) sur les
 * 4 bords d'une image RGBA ; pixels à moins de 50 % d'opacité ignorés.
 */
export function edgeColor(data: Uint8ClampedArray, width: number, height: number): string {
  const bandX = Math.max(1, Math.round(width * 0.02))
  const bandY = Math.max(1, Math.round(height * 0.02))
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let y = 0; y < height; y += 1) {
    const edgeRow = y < bandY || y >= height - bandY
    for (let x = 0; x < width; x += 1) {
      if (!edgeRow && x >= bandX && x < width - bandX) continue
      const i = (y * width + x) * 4
      if ((data[i + 3] ?? 0) < 128) continue
      r += data[i] ?? 0
      g += data[i + 1] ?? 0
      b += data[i + 2] ?? 0
      count += 1
    }
  }
  if (!count) return FILL_FALLBACK
  return `#${hex(r / count)}${hex(g / count)}${hex(b / count)}`
}
