import { useEffect, useMemo, useState } from 'react'
import { Crosshair, RotateCcw } from 'lucide-react'
import { ImageFramer } from '@/components/admin/ImageFramer'
import type { Framing } from '@/components/admin/ImageFramer'
import { imageToDataUrl, photoFill, useImage } from '@/components/admin/photo-file'
import type { ImageFormat } from '@/lib/content-image-formats'
import { FILL_FALLBACK } from '@/lib/image-zoom'

const DEFAULT_FOCUS = 50

type EditorMode = 'existing' | 'new' | null

/** Cadrage enregistré : zoom, position et couleur de remplissage calculée (US-003 v2, CA-08). */
export type SavedFraming = Framing & { fill: string }

export function ContentImageField({
  label,
  currentImagePath,
  currentCaption,
  currentFocusX,
  currentFocusY,
  currentZoom,
  format,
  pending,
  onSave,
  onSaveFocus,
}: {
  label: string
  currentImagePath: string | null
  currentCaption: string | null
  currentFocusX: number
  currentFocusY: number
  currentZoom: number
  /** Forme de l'emplacement sur le site (US-003), voir content-image-formats.ts. */
  format: ImageFormat
  pending: boolean
  onSave: (dataUrl: string, caption: string, framing: SavedFraming) => Promise<boolean>
  onSaveFocus: (caption: string, framing: SavedFraming) => Promise<boolean>
}) {
  const [mode, setMode] = useState<EditorMode>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const savedFraming: Framing = { x: currentFocusX, y: currentFocusY, zoom: currentZoom }
  const [framing, setFraming] = useState<Framing>(savedFraming)
  const [caption, setCaption] = useState(currentCaption ?? '')

  useEffect(() => {
    if (mode) return
    setFraming({ x: currentFocusX, y: currentFocusY, zoom: currentZoom })
    setCaption(currentCaption ?? '')
  }, [currentCaption, currentFocusX, currentFocusY, currentZoom, mode])

  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    },
    [fileUrl],
  )

  const previewSrc = mode === 'new' ? fileUrl : currentImagePath
  // Photo chargée : dimensions pour l'aperçu, et fichier à envoyer pour une nouvelle photo.
  const previewImage = useImage(mode ? previewSrc : null)
  const fill = useMemo(
    () => (previewImage ? photoFill(previewImage) : FILL_FALLBACK),
    [previewImage],
  )

  function openExistingEditor() {
    setFraming(savedFraming)
    setCaption(currentCaption ?? '')
    setMode('existing')
  }

  function pickFile(file: File | undefined) {
    if (!file) return
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(URL.createObjectURL(file))
    setFraming({ x: DEFAULT_FOCUS, y: DEFAULT_FOCUS, zoom: 1 })
    setCaption(currentCaption ?? '')
    setMode('new')
  }

  function closeEditor() {
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(null)
    setMode(null)
  }

  async function confirm() {
    let saved = false
    if (mode === 'new') {
      if (!previewImage) return
      saved = await onSave(imageToDataUrl(previewImage), caption, { ...framing, fill })
    } else {
      saved = await onSaveFocus(caption, { ...framing, fill })
    }
    if (saved) closeEditor()
  }

  if (!mode) {
    return (
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        {currentImagePath ? (
          <img
            src={currentImagePath}
            alt=""
            className="h-20 w-28 rounded-md object-cover"
            style={{ objectPosition: `${currentFocusX}% ${currentFocusY}%` }}
          />
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-md bg-neutral-100 text-[0.625rem] text-neutral-500">
            Aucune photo
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-600">{label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {currentImagePath ? (
              <button
                type="button"
                onClick={openExistingEditor}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
              >
                <Crosshair size={14} aria-hidden="true" />
                Ajuster le cadrage
              </button>
            ) : null}
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#4A5D2E]">
              {currentImagePath ? 'Changer la photo' : 'Ajouter une photo'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => pickFile(event.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#4A5D2E]/20 bg-[#F8F6F1] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-700">{label} — cadrage</p>
        <button
          type="button"
          onClick={() => setFraming({ ...framing, x: DEFAULT_FOCUS, y: DEFAULT_FOCUS })}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#4A5D2E] hover:bg-[#4A5D2E]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Recentrer
        </button>
      </div>

      <ImageFramer
        src={previewSrc}
        image={previewImage}
        format={format}
        framing={framing}
        fill={fill}
        onChange={setFraming}
      />

      <label className="mt-3 block max-w-[440px] text-xs font-medium text-neutral-700">
        Légende (optionnelle)
        <input
          className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </label>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={closeEditor}
          className="min-h-11 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending || (mode === 'new' && !previewImage)}
          onClick={() => void confirm()}
          className="min-h-11 rounded-lg bg-[#4A5D2E] px-4 text-xs font-semibold text-white hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer le cadrage'}
        </button>
      </div>
    </div>
  )
}
