import { useEffect, useState } from 'react'

// Photo choisie ou déjà en ligne, chargée pour l'aperçu de cadrage (dimensions naturelles) et,
// pour une nouvelle photo, réduite à MAX_IMAGE_SIDE avant l'envoi. Le fichier envoyé reste entier :
// le zoom est un réglage d'affichage (US-003).

const MAX_IMAGE_SIDE = 2400

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

export function useImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    const nextImage = new Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.src = src
    return () => setImage(null)
  }, [src])

  return image
}
