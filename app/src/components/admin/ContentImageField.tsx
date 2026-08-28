import { useEffect, useRef, useState } from 'react'
import type { CropTransform } from '@/lib/image-crop'
import { clampOffset, coverScale, drawCropped } from '@/lib/image-crop'

const FRAME_WIDTH = 380
const EXPORT_SCALE = 3 // rendu à 3x la taille d'aperçu pour rester net sur grand écran

const FALLBACK_ASPECT = 4 / 3

function useImage(src: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) {
      setImg(null)
      return
    }
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => setImg(el)
    el.src = src
    return () => setImg(null)
  }, [src])
  return img
}

export function ContentImageField({
  label,
  currentImagePath,
  currentCaption,
  pending,
  onSave,
  onCancel,
}: {
  label: string
  currentImagePath: string | null
  currentCaption: string | null
  pending: boolean
  onSave: (dataUrl: string, caption: string) => void
  onCancel: () => void
}) {
  const reference = useImage(currentImagePath)
  const aspect = reference ? reference.naturalWidth / reference.naturalHeight : FALLBACK_ASPECT
  const frameHeight = Math.round(FRAME_WIDTH / aspect)

  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const candidate = useImage(fileUrl)
  const [transform, setTransform] = useState<CropTransform>({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [caption, setCaption] = useState(currentCaption ?? '')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!candidate || !canvasRef.current) return
    drawCropped(canvasRef.current, candidate, FRAME_WIDTH, frameHeight, transform)
  }, [candidate, transform, frameHeight])

  function pickFile(file: File | undefined) {
    if (!file) return
    setTransform({ zoom: 1, offsetX: 0, offsetY: 0 })
    setFileUrl(URL.createObjectURL(file))
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current || !candidate) return
    const scale = coverScale(candidate.naturalWidth, candidate.naturalHeight, FRAME_WIDTH, frameHeight) * transform.zoom
    const next = clampOffset(
      { x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y },
      candidate.naturalWidth,
      candidate.naturalHeight,
      FRAME_WIDTH,
      frameHeight,
      scale,
    )
    setTransform((t) => ({ ...t, offsetX: next.x, offsetY: next.y }))
  }
  function onPointerUp() {
    dragRef.current = null
  }

  function confirm() {
    if (!candidate) return
    const exportCanvas = document.createElement('canvas')
    drawCropped(exportCanvas, candidate, FRAME_WIDTH * EXPORT_SCALE, frameHeight * EXPORT_SCALE, transform)
    onSave(exportCanvas.toDataURL('image/jpeg', 0.86), caption)
  }

  if (!fileUrl) {
    return (
      <div className="flex items-start gap-3">
        {currentImagePath ? (
          <img src={currentImagePath} alt="" className="h-16 w-24 rounded-md object-cover" />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-md bg-neutral-100 text-[0.625rem] text-neutral-400">
            Aucune photo
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-neutral-600">{label}</p>
          <label className="mt-1 inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100">
            Changer la photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#4A5D2E]/20 bg-[#F8F6F1] p-4">
      <p className="text-xs font-medium text-neutral-600">{label} — recadrage</p>
      <canvas
        ref={canvasRef}
        width={FRAME_WIDTH}
        height={frameHeight}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="mt-2 max-w-full cursor-grab touch-none rounded-md border border-neutral-300 active:cursor-grabbing"
        style={{ width: FRAME_WIDTH, height: frameHeight }}
      />
      <p className="mt-1 text-[0.6875rem] text-neutral-500">Glissez la photo pour la repositionner.</p>
      <label className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={transform.zoom}
          onChange={(e) => setTransform((t) => ({ ...t, zoom: Number(e.target.value) }))}
          className="flex-1"
        />
      </label>
      <label className="mt-2 block text-xs font-medium text-neutral-600">
        Légende (optionnelle)
        <input
          className="mt-1 min-h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[#4A5D2E]"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setFileUrl(null)
            onCancel()
          }}
          className="min-h-9 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className="min-h-9 rounded-lg bg-[#4A5D2E] px-4 text-xs font-semibold text-white hover:bg-[#3B4B24] disabled:opacity-50"
        >
          {pending ? 'Envoi…' : 'Valider la photo'}
        </button>
      </div>
    </div>
  )
}
