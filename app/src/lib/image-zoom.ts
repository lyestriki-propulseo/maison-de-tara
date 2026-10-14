// Cadrage des photos éditables (US-003) : un zoom (1 à 3) et un point de focus (0-100 %, sens CSS
// object-position). Rendu = fond « cover × zoom » positionné au focus : le point à x % du cadre
// montre le point à x % de la photo. Le site en garde une copie en JS (js/image-zoom.js, dépôt du
// site), testée sur les mêmes cas : toute modification se reporte des deux côtés.

export const ZOOM_MIN = 1
export const ZOOM_MAX = 3
export const ZOOM_STEP = 0.1

const round2 = (value: number) => Math.round(value * 100) / 100

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_MIN
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/** Valeur CSS background-size : la photo couvre le cadre, puis est agrandie du zoom. */
export function zoomBackgroundSize(imageRatio: number, frameRatio: number, zoom: number): string {
  const percent = `${round2(clampZoom(zoom) * 100)}%`
  // Photo plus « large » que le cadre : la hauteur remplit, la largeur déborde (et inversement).
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
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * clampZoom(zoom)
  return { width: imageWidth * scale, height: imageHeight * scale }
}

/** Zone de la photo visible dans le cadre, en fractions (0-1) de la photo. */
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
  const slackX = framing.frameWidth - shown.width
  const slackY = framing.frameHeight - shown.height
  const x = slackX < -0.5 ? framing.focusX + (framing.dx / slackX) * 100 : framing.focusX
  const y = slackY < -0.5 ? framing.focusY + (framing.dy / slackY) * 100 : framing.focusY
  return { x: round2(clampPercent(x)), y: round2(clampPercent(y)) }
}
