import { useEffect, useState } from 'react'
import { FILL_FALLBACK, edgeColor } from '@/lib/image-zoom'

// Photo choisie ou déjà en ligne, chargée pour l'aperçu de cadrage (dimensions naturelles), pour
// la couleur de remplissage (US-003 v2) et, pour une nouvelle photo, réduite à MAX_IMAGE_SIDE avant
// l'envoi. Le fichier envoyé reste entier : le zoom est un réglage d'affichage (US-003).

const MAX_IMAGE_SIDE = 2400
const FILL_SAMPLE_SIDE = 200

export function imageToDataUrl(image: HTMLImageElement): string {
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Impossible de préparer la photo')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.86)
}

/** Couleur des bords de la photo (CA-08), sur une copie réduite ; crème du site si illisible. */
export function photoFill(image: HTMLImageElement): string {
  const scale = Math.min(1, FILL_SAMPLE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return FILL_FALLBACK
    context.drawImage(image, 0, 0, width, height)
    return edgeColor(context.getImageData(0, 0, width, height).data, width, height)
  } catch {
    // Photo d'un autre domaine sans autorisation de lecture (CORS) : pixels illisibles.
    return FILL_FALLBACK
  }
}

export function useImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    let active = true
    // Lecture des pixels autorisée (CORS) pour la couleur des bords ; si le serveur refuse, on
    // recharge sans : l'aperçu marche, la couleur retombe sur le crème du site.
    const load = (crossOrigin: boolean) => {
      const nextImage = new Image()
      if (crossOrigin) nextImage.crossOrigin = 'anonymous'
      nextImage.onload = () => {
        if (active) setImage(nextImage)
      }
      if (crossOrigin) nextImage.onerror = () => load(false)
      nextImage.src = src
    }
    load(true)
    return () => {
      active = false
      setImage(null)
    }
  }, [src])

  return image
}
