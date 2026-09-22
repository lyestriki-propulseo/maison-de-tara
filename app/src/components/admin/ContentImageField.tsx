import { useEffect, useRef, useState } from 'react'
import { Crosshair, Move, RotateCcw } from 'lucide-react'

const MAX_IMAGE_SIDE = 2400
const DEFAULT_FOCUS = 50

type Focus = { x: number; y: number }
type EditorMode = 'existing' | 'new' | null

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function imageToDataUrl(image: HTMLImageElement): string {
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Impossible de préparer la photo')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.86)
}

function useImage(src: string | null) {
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

export function ContentImageField({
  label,
  currentImagePath,
  currentCaption,
  currentFocusX,
  currentFocusY,
  pending,
  onSave,
  onSaveFocus,
}: {
  label: string
  currentImagePath: string | null
  currentCaption: string | null
  currentFocusX: number
  currentFocusY: number
  pending: boolean
  onSave: (dataUrl: string, caption: string, focusX: number, focusY: number) => Promise<boolean>
  onSaveFocus: (caption: string, focusX: number, focusY: number) => Promise<boolean>
}) {
  const [mode, setMode] = useState<EditorMode>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const candidate = useImage(fileUrl)
  const [focus, setFocus] = useState<Focus>({ x: currentFocusX, y: currentFocusY })
  const [caption, setCaption] = useState(currentCaption ?? '')
  const dragRef = useRef<{
    pointerX: number
    pointerY: number
    focusX: number
    focusY: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    if (mode) return
    setFocus({ x: currentFocusX, y: currentFocusY })
    setCaption(currentCaption ?? '')
  }, [currentCaption, currentFocusX, currentFocusY, mode])

  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    },
    [fileUrl],
  )

  const previewSrc = mode === 'new' ? fileUrl : currentImagePath

  function openExistingEditor() {
    setFocus({ x: currentFocusX, y: currentFocusY })
    setCaption(currentCaption ?? '')
    setMode('existing')
  }

  function pickFile(file: File | undefined) {
    if (!file) return
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(URL.createObjectURL(file))
    setFocus({ x: DEFAULT_FOCUS, y: DEFAULT_FOCUS })
    setCaption(currentCaption ?? '')
    setMode('new')
  }

  function closeEditor() {
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(null)
    setMode(null)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      focusX: focus.x,
      focusY: focus.y,
      width: rect.width,
      height: rect.height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    setFocus({
      x: clampPercent(drag.focusX - ((event.clientX - drag.pointerX) / drag.width) * 100),
      y: clampPercent(drag.focusY - ((event.clientY - drag.pointerY) / drag.height) * 100),
    })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  async function confirm() {
    let saved = false
    if (mode === 'new') {
      if (!candidate) return
      saved = await onSave(imageToDataUrl(candidate), caption, focus.x, focus.y)
    } else {
      saved = await onSaveFocus(caption, focus.x, focus.y)
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
          onClick={() => setFocus({ x: DEFAULT_FOCUS, y: DEFAULT_FOCUS })}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#4A5D2E] hover:bg-[#4A5D2E]/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E]"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Recentrer
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-2 aspect-[8/5] w-full max-w-[440px] cursor-grab touch-none overflow-hidden rounded-md bg-neutral-200 active:cursor-grabbing"
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Aperçu du cadrage"
            draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
          />
        ) : null}
        <span
          className="pointer-events-none absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          <span className="grid size-8 place-items-center rounded-full border border-white/90 bg-black/25 text-white">
            <Move size={15} />
          </span>
        </span>
      </div>
      <p className="mt-2 max-w-[60ch] text-[0.6875rem] leading-relaxed text-neutral-600">
        Faites glisser la photo pour placer le sujet. Le site conservera ce point de focus dans tous
        les formats.
      </p>

      <div className="mt-3 grid max-w-[440px] gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-700">
          Position horizontale
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={focus.x}
            onChange={(event) => setFocus((value) => ({ ...value, x: Number(event.target.value) }))}
            className="mt-1 block h-11 w-full accent-[#4A5D2E]"
          />
        </label>
        <label className="text-xs font-medium text-neutral-700">
          Position verticale
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={focus.y}
            onChange={(event) => setFocus((value) => ({ ...value, y: Number(event.target.value) }))}
            className="mt-1 block h-11 w-full accent-[#4A5D2E]"
          />
        </label>
      </div>

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
          disabled={pending || (mode === 'new' && !candidate)}
          onClick={() => void confirm()}
          className="min-h-11 rounded-lg bg-[#4A5D2E] px-4 text-xs font-semibold text-white hover:bg-[#3B4B24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer le cadrage'}
        </button>
      </div>
    </div>
  )
}
