import { useRef } from 'react'
import { Minus, Move, Plus } from 'lucide-react'
import type { ImageFormat } from '@/lib/content-image-formats'
import {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  clampZoom,
  focusAfterDrag,
  zoomBackgroundSize,
} from '@/lib/image-zoom'

// Aperçu de cadrage (US-003) : cadre à la forme réelle de l'emplacement sur le site, photo peinte
// en fond « cover × zoom » au point de focus — le même rendu que js/site-content.js côté site.

export type Framing = { x: number; y: number; zoom: number }

const PREVIEW_MAX_WIDTH = 440
const PREVIEW_MAX_HEIGHT = 360

const percentLabel = (zoom: number) => `${Math.round(zoom * 100)} %`

export function ImageFramer({
  src,
  image,
  format,
  framing,
  onChange,
}: {
  src: string | null
  /** Photo chargée (dimensions naturelles), null tant qu'elle n'est pas prête. */
  image: HTMLImageElement | null
  format: ImageFormat
  framing: Framing
  onChange: (framing: Framing) => void
}) {
  const dragRef = useRef<{ pointerX: number; pointerY: number; start: Framing } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const width = Math.round(Math.min(PREVIEW_MAX_WIDTH, PREVIEW_MAX_HEIGHT * format.ratio))
  const imageRatio = image ? image.naturalWidth / image.naturalHeight : null

  function setZoom(zoom: number) {
    onChange({ ...framing, zoom: Math.round(clampZoom(zoom) * 100) / 100 })
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, start: framing }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const frame = frameRef.current
    if (!drag || !frame || !image) return
    const focus = focusAfterDrag({
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      frameWidth: frame.clientWidth,
      frameHeight: frame.clientHeight,
      zoom: drag.start.zoom,
      focusX: drag.start.x,
      focusY: drag.start.y,
      dx: event.clientX - drag.pointerX,
      dy: event.clientY - drag.pointerY,
    })
    onChange({ ...drag.start, ...focus })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  const buttonClass =
    'grid size-11 shrink-0 place-items-center rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:opacity-40'

  return (
    <div>
      <div
        ref={frameRef}
        role="img"
        aria-label="Aperçu du cadrage"
        data-testid="apercu-cadrage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-2 cursor-grab touch-none overflow-hidden bg-neutral-200 active:cursor-grabbing"
        style={{
          width: `min(100%, ${width}px)`,
          aspectRatio: String(format.ratio),
          borderRadius: format.arch ? '999px 999px 0 0' : '6px',
          backgroundImage: src && imageRatio ? `url("${src}")` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundSize: imageRatio
            ? zoomBackgroundSize(imageRatio, format.ratio, framing.zoom)
            : undefined,
          backgroundPosition: `${framing.x}% ${framing.y}%`,
        }}
      >
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
        L’aperçu a la forme de l’emplacement sur le site (écran d’ordinateur). Faites glisser la
        photo pour placer le sujet, zoomez pour resserrer le cadre.
      </p>

      <div className="mt-3 flex max-w-[440px] items-end gap-2">
        <button
          type="button"
          aria-label="Dézoomer"
          disabled={framing.zoom <= ZOOM_MIN}
          onClick={() => setZoom(framing.zoom - ZOOM_STEP)}
          className={buttonClass}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <label className="min-w-0 flex-1 text-xs font-medium text-neutral-700">
          <span className="flex justify-between">
            Zoom <span className="tabular-nums">{percentLabel(framing.zoom)}</span>
          </span>
          <input
            type="range"
            min={ZOOM_MIN * 100}
            max={ZOOM_MAX * 100}
            step={1}
            value={Math.round(framing.zoom * 100)}
            onChange={(event) => setZoom(Number(event.target.value) / 100)}
            className="mt-1 block h-11 w-full accent-[#4A5D2E]"
          />
        </label>
        <button
          type="button"
          aria-label="Zoomer"
          disabled={framing.zoom >= ZOOM_MAX}
          onClick={() => setZoom(framing.zoom + ZOOM_STEP)}
          className={buttonClass}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid max-w-[440px] gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-700">
          Position horizontale
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={framing.x}
            onChange={(event) => onChange({ ...framing, x: Number(event.target.value) })}
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
            value={framing.y}
            onChange={(event) => onChange({ ...framing, y: Number(event.target.value) })}
            className="mt-1 block h-11 w-full accent-[#4A5D2E]"
          />
        </label>
      </div>
    </div>
  )
}
