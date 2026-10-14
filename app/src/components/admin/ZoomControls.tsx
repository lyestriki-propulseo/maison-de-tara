import { Minus, Plus } from 'lucide-react'
import { ZOOM_MAX, ZOOM_STEP, ZOOM_WHOLE, clampZoom } from '@/lib/image-zoom'

// Réglage du zoom (US-003) : boutons − / + et curseur, de « Photo entière » à 300 %. Tant que la
// photo n'est pas chargée, son minimum est inconnu : le zoom ne descend pas sous 100 %.

const buttonClass =
  'grid size-11 shrink-0 place-items-center rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D2E] disabled:opacity-40'

/** Zoom enregistrable : sous « Photo entière » (+ 0,5 %) → mode « Photo entière » ; sinon arrondi vers le bas. */
// + 1e-6 : 0,57 × 100 vaut 56,999… en virgule flottante.
const floor2 = (value: number) => Math.floor(clampZoom(value) * 100 + 1e-6) / 100

export function nextZoom(value: number, whole: number | null): number {
  // Photo pas encore chargée, ou déjà à la forme du cadre : pas de dézoom possible.
  if (whole === null || whole >= 0.995) return Math.max(1, floor2(value))
  if (value <= whole + 0.005) return ZOOM_WHOLE
  return floor2(value)
}

export function ZoomControls({
  zoom,
  whole,
  onChange,
}: {
  /** Zoom enregistré (0 = « Photo entière »). */
  zoom: number
  /** Zoom « Photo entière » pour cette photo et cet emplacement ; null tant que la photo charge. */
  whole: number | null
  onChange: (zoom: number) => void
}) {
  const minPercent = whole === null || whole >= 0.995 ? 100 : Math.floor(whole * 100)
  const shown = zoom === ZOOM_WHOLE ? (whole ?? 1) : zoom
  const atMin = zoom === ZOOM_WHOLE || shown * 100 <= minPercent
  const set = (value: number) => onChange(nextZoom(value, whole))

  return (
    <div className="mt-3 flex max-w-[440px] items-end gap-2">
      <button
        type="button"
        aria-label="Dézoomer"
        disabled={atMin}
        onClick={() => set(shown - ZOOM_STEP)}
        className={buttonClass}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <label className="min-w-0 flex-1 text-xs font-medium text-neutral-700">
        <span className="flex justify-between">
          Zoom
          <span className="tabular-nums">
            {zoom === ZOOM_WHOLE ? 'Photo entière' : `${Math.round(zoom * 100)} %`}
          </span>
        </span>
        <input
          type="range"
          min={minPercent}
          max={ZOOM_MAX * 100}
          step={1}
          value={Math.max(minPercent, Math.round(shown * 100))}
          onChange={(event) => {
            const percent = Number(event.target.value)
            set(percent <= minPercent ? 0 : percent / 100)
          }}
          className="mt-1 block h-11 w-full accent-[#4A5D2E]"
        />
      </label>
      <button
        type="button"
        aria-label="Zoomer"
        disabled={shown >= ZOOM_MAX}
        onClick={() => set(shown + ZOOM_STEP)}
        className={buttonClass}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
