import { describe, expect, test } from 'vitest'
import {
  FILL_FALLBACK,
  ZOOM_MAX,
  ZOOM_WHOLE,
  clampZoom,
  edgeColor,
  effectiveZoom,
  focusAfterDrag,
  visibleArea,
  wholeZoom,
  zoomBackgroundSize,
} from '@/lib/image-zoom'

// US-003 — calcul du cadrage (zoom + position → zone visible). Le site en garde une copie en JS
// (js/image-zoom.js, dépôt du site) testée sur les MÊMES cas : tests/image-zoom.test.mjs.

// Cas partagés avec tests/image-zoom.test.mjs (site) : toute modification se reporte des deux côtés.
// zoom 0 = mode « Photo entière ».
const SHARED_CASES = [
  { image: [1600, 1200], frame: [0.741, 1], zoom: 1.3, size: 'auto 130%' },
  { image: [1200, 1600], frame: [1.6, 1], zoom: 2, size: '200% auto' },
  { image: [1000, 1000], frame: [1, 1], zoom: 1, size: 'auto 100%' },
  { image: [1500, 1000], frame: [0.75, 1], zoom: 0, size: 'auto 50%' },
  { image: [1500, 1000], frame: [0.75, 1], zoom: 0.8, size: 'auto 80%' },
  { image: [1500, 1000], frame: [0.75, 1], zoom: 0.3, size: 'auto 50%' },
  { image: [1000, 2000], frame: [1, 1], zoom: 0, size: '50% auto' },
] as const

/** Pixels RGBA d'une image unie de w × h, avec un carré central d'une autre couleur. */
function pixels(w: number, h: number, edge: number[], center: number[], alpha = 255) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const inside = x > w / 4 && x < (3 * w) / 4 && y > h / 4 && y < (3 * h) / 4
      const [r = 0, g = 0, b = 0] = inside ? center : edge
      data.set([r, g, b, inside ? 255 : alpha], (y * w + x) * 4)
    }
  }
  return data
}

describe('image-zoom', () => {
  test('CA-02 — zoom borné à 300 %, 0 = mode « Photo entière », valeur invalide = 100 %', () => {
    expect(ZOOM_WHOLE).toBe(0)
    expect(ZOOM_MAX).toBe(3)
    expect(clampZoom(4)).toBe(3)
    expect(clampZoom(1.37)).toBe(1.37)
    expect(clampZoom(0.62)).toBe(0.62)
    expect(clampZoom(0)).toBe(0)
    expect(clampZoom(-1)).toBe(0)
    expect(clampZoom(Number.NaN)).toBe(1)
  })

  test('CA-02 — « Photo entière » = la photo tient juste dans le rectangle du cadre', () => {
    expect(wholeZoom(1.5, 0.75)).toBeCloseTo(0.5)
    expect(wholeZoom(0.5, 1)).toBeCloseTo(0.5)
    expect(wholeZoom(1, 1)).toBe(1)
  })

  test('CA-05 — le zoom affiché n’est jamais sous « Photo entière », recalculée à chaque largeur', () => {
    // Même photo 3:2 enregistrée en mode « Photo entière » : entière à 1280 comme à 1920 px.
    expect(effectiveZoom(0, 1.5, 0.92)).toBeCloseTo(0.92 / 1.5)
    expect(effectiveZoom(0, 1.5, 1.37)).toBeCloseTo(1.37 / 1.5)
    // Un pourcentage sous « Photo entière » à cette largeur est remonté.
    expect(effectiveZoom(0.5, 1.5, 0.92)).toBeCloseTo(0.92 / 1.5)
    expect(effectiveZoom(0.8, 1.5, 0.92)).toBe(0.8)
    // Lignes v1 (zoom absent / invalide) : 100 %.
    expect(effectiveZoom(Number.NaN, 1.5, 0.92)).toBe(1)
  })

  test('CA-04 — taille de fond identique au site pour les cas partagés', () => {
    for (const c of SHARED_CASES) {
      expect(zoomBackgroundSize(c.image[0] / c.image[1], c.frame[0] / c.frame[1], c.zoom)).toBe(
        c.size,
      )
    }
  })

  test('CA-04 — à 100 %, la zone visible est celle d’un object-fit: cover centré sur le focus', () => {
    // Photo 4:3 dans un cadre carré : la hauteur remplit, on voit 3/4 de la largeur.
    const area = visibleArea({
      imageWidth: 1600,
      imageHeight: 1200,
      frameWidth: 500,
      frameHeight: 500,
      zoom: 1,
      focusX: 50,
      focusY: 50,
    })
    expect(area.width).toBeCloseTo(0.75)
    expect(area.height).toBeCloseTo(1)
    expect(area.left).toBeCloseTo(0.125)
    expect(area.top).toBeCloseTo(0)
  })

  test('CA-04 — à 200 %, la zone visible est deux fois plus petite et garde le point de focus fixe', () => {
    const area = visibleArea({
      imageWidth: 1000,
      imageHeight: 1000,
      frameWidth: 400,
      frameHeight: 400,
      zoom: 2,
      focusX: 25,
      focusY: 100,
    })
    expect(area.width).toBeCloseTo(0.5)
    expect(area.height).toBeCloseTo(0.5)
    // Le point à 25 % du cadre montre le point à 25 % de l'image.
    expect(area.left + 0.25 * area.width).toBeCloseTo(0.25)
    expect(area.top + area.height).toBeCloseTo(1)
  })

  test('CA-05 — à 100 % et plus, la zone visible reste dans la photo (pas de bande)', () => {
    for (const zoom of [1, 1.5, 3]) {
      for (const focusX of [0, 33, 100]) {
        for (const focusY of [0, 71, 100]) {
          const area = visibleArea({
            imageWidth: 1200,
            imageHeight: 800,
            frameWidth: 300,
            frameHeight: 420,
            zoom,
            focusX,
            focusY,
          })
          expect(area.left).toBeGreaterThanOrEqual(-1e-9)
          expect(area.top).toBeGreaterThanOrEqual(-1e-9)
          expect(area.left + area.width).toBeLessThanOrEqual(1 + 1e-9)
          expect(area.top + area.height).toBeLessThanOrEqual(1 + 1e-9)
        }
      }
    }
  })

  test('CA-05 — en mode « Photo entière », toute la photo est dans le cadre, placée par la position', () => {
    // Photo 3:2 dans une arche 0,741 : largeur entière, bande au-dessus quand la photo est en bas.
    const area = visibleArea({
      imageWidth: 1500,
      imageHeight: 1000,
      frameWidth: 296.4,
      frameHeight: 400,
      zoom: ZOOM_WHOLE,
      focusX: 50,
      focusY: 100,
    })
    expect(area.left).toBeCloseTo(0)
    expect(area.width).toBeCloseTo(1)
    expect(area.top).toBeLessThan(0)
    expect(area.top + area.height).toBeCloseTo(1)
  })

  test('CA-02 — glisser déplace la photo avec le doigt, sans jamais sortir de 0-100', () => {
    const frame = { imageWidth: 1000, imageHeight: 1000, frameWidth: 400, frameHeight: 400 }
    // À 200 %, la photo affichée fait 800 px : 400 px de marge pour 100 % de position.
    expect(focusAfterDrag({ ...frame, zoom: 2, focusX: 50, focusY: 50, dx: 100, dy: -40 })).toEqual(
      { x: 25, y: 60 },
    )
    expect(
      focusAfterDrag({ ...frame, zoom: 2, focusX: 10, focusY: 90, dx: 400, dy: -400 }),
    ).toEqual({ x: 0, y: 100 })
    // À 100 % sur une photo carrée dans un cadre carré, rien à déplacer.
    expect(focusAfterDrag({ ...frame, zoom: 1, focusX: 50, focusY: 50, dx: 80, dy: 80 })).toEqual({
      x: 50,
      y: 50,
    })
  })

  test('CA-02 — sous 100 %, glisser place la photo dans la bande (vers le bas = position 100)', () => {
    // Photo 2:1 entière dans un cadre carré de 400 px : 200 px de haut, 200 px de bande.
    const framing = {
      imageWidth: 2000,
      imageHeight: 1000,
      frameWidth: 400,
      frameHeight: 400,
      zoom: ZOOM_WHOLE,
    }
    expect(focusAfterDrag({ ...framing, focusX: 50, focusY: 50, dx: 0, dy: 100 })).toEqual({
      x: 50,
      y: 100,
    })
    expect(focusAfterDrag({ ...framing, focusX: 50, focusY: 50, dx: 0, dy: -50 })).toEqual({
      x: 50,
      y: 25,
    })
  })

  test('CA-08 — fond uni : la couleur de remplissage est celle des bords', () => {
    const data = pixels(200, 120, [248, 243, 230], [40, 30, 20])
    expect(edgeColor(data, 200, 120)).toBe('#f8f3e6')
  })

  test('CA-08 — bords contrastés : moyenne des 4 bords, l’intérieur est ignoré', () => {
    const w = 100
    const h = 100
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        // Moitié gauche noire, moitié droite blanche : moyenne grise.
        const v = x < w / 2 ? 0 : 255
        data.set([v, v, v, 255], (y * w + x) * 4)
      }
    }
    expect(edgeColor(data, w, h)).toBe('#808080')
  })

  test('CA-08 — pixels transparents ignorés ; rien d’exploitable → crème du site', () => {
    const half = pixels(100, 100, [0, 0, 0], [10, 10, 10], 0)
    expect(edgeColor(half, 100, 100)).toBe(FILL_FALLBACK)
    expect(FILL_FALLBACK).toBe('#fbf7ec')
    expect(edgeColor(new Uint8ClampedArray(0), 0, 0)).toBe(FILL_FALLBACK)
  })
})
