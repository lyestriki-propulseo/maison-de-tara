import type { Locator, Page } from '@playwright/test'
import { visibleArea } from '@/lib/image-zoom'

// US-003 — preuve de CA-04 : ce qui est peint à l'écran (site ou aperçu de l'admin) est-il la zone
// que le calcul de l'admin (visibleArea) annonce ? Utilisé par e2e-site/photos-zoom.e2e.ts et
// e2e/contenu-photos-zoom.e2e.ts.

/**
 * Écart moyen (0-255) entre la zone de contenu de la photo à l'écran et la zone que le calcul de
 * l'admin (visibleArea) dit visible, redessinée depuis le fichier source — sous 100 % (v2), sur la
 * couleur de remplissage `fill`. Limité au centre du cadre pour ignorer l'arrondi des arches.
 */
export async function differenceWithAdminFraming(
  page: Page,
  target: Locator,
  zoom: number,
  focus: [number, number],
  fill?: string,
) {
  await target.scrollIntoViewIfNeeded()
  // Apparitions au défilement : on laisse l'observateur les déclencher, puis on attend qu'elles
  // soient finies (les animations en boucle sont ignorées).
  await page.waitForTimeout(150)
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  )
  const box = await target.evaluate(async (el: HTMLElement) => {
    const style = getComputedStyle(el)
    const px = (value: string) => parseFloat(value) || 0
    const rect = el.getBoundingClientRect()
    const source = new Image()
    source.crossOrigin = 'anonymous' // photo du stockage Supabase : pixels lisibles
    // Photo du site (<img>) ou aperçu de l'admin (fond CSS).
    source.src =
      el instanceof HTMLImageElement
        ? el.currentSrc || el.src
        : (/url\("?([^")]+)"?\)/.exec(style.backgroundImage)?.[1] ?? '')
    await source.decode()
    return {
      left: rect.left + px(style.borderLeftWidth) + px(style.paddingLeft),
      top: rect.top + px(style.borderTopWidth) + px(style.paddingTop),
      width: el.clientWidth - px(style.paddingLeft) - px(style.paddingRight),
      height: el.clientHeight - px(style.paddingTop) - px(style.paddingBottom),
      src: source.src,
      imageWidth: source.naturalWidth,
      imageHeight: source.naturalHeight,
    }
  })
  const area = visibleArea({
    imageWidth: box.imageWidth,
    imageHeight: box.imageHeight,
    frameWidth: box.width,
    frameHeight: box.height,
    zoom,
    focusX: focus[0],
    focusY: focus[1],
  })
  const clip = {
    x: Math.round(box.left + box.width * 0.2),
    y: Math.round(box.top + box.height * 0.45),
    width: Math.round(box.width * 0.6),
    height: Math.round(box.height * 0.45),
  }
  const shot = (await page.screenshot({ clip })).toString('base64')
  return page.evaluate(
    async (input) => {
      const { box: frame, clip: zone, area: shown, fill: band } = input
      const load = async (src: string) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.src = src
        await image.decode()
        return image
      }
      const [source, screen] = await Promise.all([
        load(frame.src),
        load(`data:image/png;base64,${input.shot}`),
      ])
      const pixels = (draw: (context: CanvasRenderingContext2D) => void, x: number, y: number) => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(frame.width)
        canvas.height = Math.ceil(frame.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas indisponible')
        draw(context)
        return context.getImageData(x, y, zone.width, zone.height).data
      }
      const expected = pixels(
        (context) => {
          if (band) {
            context.fillStyle = band
            context.fillRect(0, 0, frame.width, frame.height)
          }
          // Source hors de la photo (sous 100 %) : le navigateur la recadre et ajuste la destination.
          context.drawImage(
            source,
            shown.left * frame.imageWidth,
            shown.top * frame.imageHeight,
            shown.width * frame.imageWidth,
            shown.height * frame.imageHeight,
            0,
            0,
            frame.width,
            frame.height,
          )
        },
        zone.x - frame.left,
        zone.y - frame.top,
      )
      const actual = pixels((context) => context.drawImage(screen, 0, 0), 0, 0)
      let sum = 0
      for (let i = 0; i < actual.length; i += 4) {
        for (let c = 0; c < 3; c += 1)
          sum += Math.abs((actual[i + c] ?? 0) - (expected[i + c] ?? 0))
      }
      return sum / ((actual.length / 4) * 3)
    },
    { shot, box, clip, area, fill: fill ?? null },
  )
}
