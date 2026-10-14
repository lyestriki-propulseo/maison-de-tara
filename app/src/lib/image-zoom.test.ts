import { describe, expect, test } from 'vitest'
import {
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  focusAfterDrag,
  visibleArea,
  zoomBackgroundSize,
} from '@/lib/image-zoom'

// US-003 — calcul du cadrage (zoom + position → zone visible). Le site en garde une copie en JS
// (js/image-zoom.js, dépôt du site) testée sur les MÊMES cas : tests/image-zoom.test.mjs.

// Cas partagés avec tests/image-zoom.test.mjs (site) : toute modification se reporte des deux côtés.
const SHARED_CASES = [
  { image: [1600, 1200], frame: [0.741, 1], zoom: 1.3, focus: [50, 40], size: 'auto 130%' },
  { image: [1200, 1600], frame: [1.6, 1], zoom: 2, focus: [20, 80], size: '200% auto' },
  { image: [1000, 1000], frame: [1, 1], zoom: 1, focus: [50, 50], size: 'auto 100%' },
] as const

describe('image-zoom', () => {
  test('CA-02 — le zoom est borné entre 100 % et 300 %', () => {
    expect(ZOOM_MIN).toBe(1)
    expect(ZOOM_MAX).toBe(3)
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(4)).toBe(3)
    expect(clampZoom(1.37)).toBe(1.37)
    expect(clampZoom(Number.NaN)).toBe(1)
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

  test('CA-05 — à tout zoom et toute position, la zone visible reste dans la photo', () => {
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
})
