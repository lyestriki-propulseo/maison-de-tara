// Maths de recadrage : ajuste une image dans un cadre à ratio fixe (façon CSS "object-fit: cover"),
// avec un zoom et un décalage pilotés par l'utilisateur. Utilisé par ContentImageField.

export type CropTransform = { zoom: number; offsetX: number; offsetY: number }

export function coverScale(imgW: number, imgH: number, frameW: number, frameH: number): number {
  return Math.max(frameW / imgW, frameH / imgH)
}

// Empêche le décalage de découvrir un bord vide autour du cadre.
export function clampOffset(
  offset: { x: number; y: number },
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  scale: number,
): { x: number; y: number } {
  const drawW = imgW * scale
  const drawH = imgH * scale
  const maxX = Math.max(0, (drawW - frameW) / 2)
  const maxY = Math.max(0, (drawH - frameH) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  }
}

export function drawCropped(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  frameW: number,
  frameH: number,
  transform: CropTransform,
) {
  canvas.width = frameW
  canvas.height = frameH
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const base = coverScale(img.naturalWidth, img.naturalHeight, frameW, frameH)
  const scale = base * transform.zoom
  const offset = clampOffset(
    { x: transform.offsetX, y: transform.offsetY },
    img.naturalWidth,
    img.naturalHeight,
    frameW,
    frameH,
    scale,
  )
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  const dx = (frameW - drawW) / 2 + offset.x
  const dy = (frameH - drawH) / 2 + offset.y
  ctx.clearRect(0, 0, frameW, frameH)
  ctx.drawImage(img, dx, dy, drawW, drawH)
}
