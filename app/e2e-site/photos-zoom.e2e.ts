import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { IMAGE_FORMATS, isHiddenContentPhoto } from '@/lib/content-image-formats'
import { edgeColor } from '@/lib/image-zoom'
import { differenceWithAdminFraming } from './support/framing'
import { capturePng } from './support/png'
import { mockSupabase } from './support/supabase-mock'
import type { ContentRow } from './support/supabase-mock'

// US-003 — zoom des photos éditables, rendu côté site (js/image-zoom.js + js/site-content.js).
// Voir docs/us/US-003-cadrage-photos-zoom.md. Calcul partagé : app/src/lib/image-zoom.test.ts et
// tests/image-zoom.test.mjs (dépôt du site).

const PAGES = {
  accueil: '/wandau-mdt/index.html',
  atelier: '/wandau-mdt/atelier.html',
  boutique: '/wandau-mdt/boutique.html',
  calendrier: '/wandau-mdt/calendrier.html',
  contact: '/wandau-mdt/contact.html',
  histoire: '/wandau-mdt/histoire.html',
} as const

const PHOTO = '/assets-premium-lp/experience-01-choisir.jpg'

function photo(
  field_key: string,
  focus: [number, number],
  zoom?: number,
  image_path = PHOTO,
  image_fill?: string | null,
): ContentRow {
  const row: ContentRow = {
    field_key,
    field_type: 'image',
    image_path,
    image_focus_x: focus[0],
    image_focus_y: focus[1],
    ...(image_fill === undefined ? {} : { image_fill }),
  }
  return zoom === undefined ? row : { ...row, image_zoom: zoom }
}

const img = (page: Page, key: string) => page.locator(`img[data-mdt-content="${key}"]`)

type Measured = { key: string; ratio: number; arch: boolean; visible: boolean }

// Même mesure que celle qui a rempli IMAGE_FORMATS : zone de contenu de la photo + arrondi en haut.
async function measurePhotos(page: Page): Promise<Measured[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('img[data-mdt-content]')].map((el) => {
      const style = getComputedStyle(el)
      const px = (value: string) => parseFloat(value) || 0
      const width = el.clientWidth - px(style.paddingLeft) - px(style.paddingRight)
      const height = el.clientHeight - px(style.paddingTop) - px(style.paddingBottom)
      let radius = px(style.borderTopLeftRadius)
      let radiusWidth = el.clientWidth
      for (
        let a = el.parentElement;
        a && radius === 0 && a !== document.body;
        a = a.parentElement
      ) {
        const s = getComputedStyle(a)
        if (s.overflow !== 'visible' && px(s.borderTopLeftRadius) > 0) {
          radius = px(s.borderTopLeftRadius)
          radiusWidth = a.clientWidth
        }
      }
      return {
        key: el.dataset.mdtContent ?? '',
        ratio: width / height,
        arch: radius >= radiusWidth * 0.4,
        visible: width > 0 && height > 0,
      }
    }),
  )
}

test('CA-01 — la table des formats de l’admin correspond aux 40 emplacements du site à 1440 px', async ({
  page,
}) => {
  await mockSupabase(page, { down: true })
  const seen = new Set<string>()
  for (const url of Object.values(PAGES)) {
    await page.goto(url)
    await page.evaluate(() =>
      document.querySelectorAll<HTMLElement>('[hidden]').forEach((el) => {
        if (el.querySelector('[data-mdt-content]')) el.hidden = false
      }),
    )
    for (const measured of await measurePhotos(page)) {
      if (isHiddenContentPhoto(measured.key)) continue
      seen.add(measured.key)
      const format = IMAGE_FORMATS[measured.key]
      if (!format) throw new Error(`${measured.key} absent de IMAGE_FORMATS`)
      expect(measured.visible, measured.key).toBe(true)
      expect(Math.abs(measured.ratio - format.ratio) / format.ratio, measured.key).toBeLessThan(
        0.01,
      )
      expect(measured.arch, measured.key).toBe(format.arch)
    }
  }
  expect([...seen].sort()).toEqual(Object.keys(IMAGE_FORMATS).sort())
  expect(seen.size).toBe(40)
})

test('CA-04 — à 1440 px, la zone visible est celle calculée par l’admin (rectangle et arche)', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      boutique: [photo('boutique.galerie.02.photo', [30, 70], 1.8)],
      atelier: [photo('atelier.ch01.photo', [65, 20], 2.4)],
    },
  })
  await page.goto(PAGES.boutique)
  await expect(img(page, 'boutique.galerie.02.photo')).toHaveAttribute('data-mdt-zoom', '1.8')
  expect(
    await differenceWithAdminFraming(page, img(page, 'boutique.galerie.02.photo'), 1.8, [30, 70]),
  ).toBeLessThan(6)
  // Témoin : la mesure distingue bien un zoom voisin (2 au lieu de 1,8) et un autre focus.
  expect(
    await differenceWithAdminFraming(page, img(page, 'boutique.galerie.02.photo'), 2, [30, 70]),
  ).toBeGreaterThan(6)
  expect(
    await differenceWithAdminFraming(page, img(page, 'boutique.galerie.02.photo'), 1.8, [40, 70]),
  ).toBeGreaterThan(6)

  await page.goto(PAGES.atelier)
  await expect(img(page, 'atelier.ch01.photo')).toHaveAttribute('data-mdt-zoom', '2.4')
  expect(
    await differenceWithAdminFraming(page, img(page, 'atelier.ch01.photo'), 2.4, [65, 20]),
  ).toBeLessThan(6)
})

test('CA-05 — rien n’est peint avant que la nouvelle photo soit chargée (pas de cadre vide)', async ({
  page,
}) => {
  const key = 'atelier.ch01.photo'
  const slow = '/assets-premium-lp/sortie-four.jpg?lent'
  await mockSupabase(page, { content: { atelier: [photo(key, [65, 20], 2, slow)] } })
  await page.route(
    (url) => url.search === '?lent',
    async (route) => {
      await new Promise((done) => setTimeout(done, 2500))
      await route.continue()
    },
  )
  await page.goto(PAGES.atelier, { waitUntil: 'domcontentloaded' })
  const target = img(page, key)
  await expect(target).toHaveAttribute('src', slow)
  // Nouvelle photo pas encore arrivée : la photo normale reste affichée (pas poussée hors cadre),
  // le fond attend dessous sans taille calculée.
  await page.waitForTimeout(500)
  expect(await target.evaluate((el) => [el.style.objectPosition, el.style.backgroundSize])).toEqual(
    ['65% 20%', ''],
  )
  await expect(target).not.toHaveAttribute('data-mdt-zoom')
  await expect(target).toHaveAttribute('data-mdt-zoom', '2', { timeout: 10_000 })
  expect(await differenceWithAdminFraming(page, target, 2, [65, 20])).toBeLessThan(6)
})

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  test(`CA-05 — à ${viewport.width} px, la photo zoomée remplit son cadre sans bande vide`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await mockSupabase(page, {
      content: { boutique: [photo('boutique.hero.photo', [0, 100], 3)] },
    })
    await page.goto(PAGES.boutique)
    await expect(img(page, 'boutique.hero.photo')).toHaveAttribute('data-mdt-zoom', '3')
    expect(
      await differenceWithAdminFraming(page, img(page, 'boutique.hero.photo'), 3, [0, 100]),
    ).toBeLessThan(6)
  })
}

test('CA-05 — zoomée, la photo ne déborde ni de son emplacement ni sur son cadre doré', async ({
  page,
}) => {
  const key = 'atelier.priva.photo1'
  await mockSupabase(page, { content: { atelier: [photo(key, [50, 50], 1)] } })
  await page.goto(PAGES.atelier)
  // Taille de mise en page (sans les transformations des apparitions, qui varient d'un chargement
  // à l'autre) : la photo zoomée occupe exactement la même boîte.
  const layoutSize = (el: HTMLElement) => [el.offsetWidth, el.offsetHeight]
  const before = await img(page, key).evaluate(layoutSize)

  await mockSupabase(page, { content: { atelier: [photo(key, [50, 50], 3)] } })
  await page.goto(PAGES.atelier)
  const target = img(page, key)
  await expect(target).toHaveAttribute('data-mdt-zoom', '3')
  expect(await target.evaluate(layoutSize)).toEqual(before)
  const style = await target.evaluate((el) => {
    const s = getComputedStyle(el)
    return { clip: s.backgroundClip, origin: s.backgroundOrigin, color: s.backgroundColor }
  })
  // Photo limitée à la zone de contenu ; le passe-partout crème garde sa couleur et sa zone.
  expect(style.clip).toBe('content-box, border-box')
  expect(style.origin).toBe('content-box, padding-box')
  expect(style.color).not.toBe('rgba(0, 0, 0, 0)')
})

test('CA-06 — photos à 100 % (ou lues sans zoom) : rien de nouveau n’est posé, cadrages existants gardés', async ({
  page,
}) => {
  const content: Record<string, ContentRow[]> = {}
  for (const key of Object.keys(IMAGE_FORMATS)) {
    const pageName = key.split('.')[0] ?? ''
    const focus: [number, number] =
      key === 'accueil.hero.photo'
        ? [41, 52]
        : key === 'accueil.parcours.04.photo'
          ? [57.27, 71.45]
          : [50, 50]
    // Une ligne sur deux sans image_zoom, pour couvrir les deux cas.
    const zoom = (content[pageName]?.length ?? 0) % 2 ? undefined : 1
    ;(content[pageName] ??= []).push(photo(key, focus, zoom))
  }
  await mockSupabase(page, { content })
  for (const [name, url] of Object.entries(PAGES)) {
    await page.goto(url)
    const firstKey = Object.keys(IMAGE_FORMATS).find((key) => key.startsWith(`${name}.`)) ?? ''
    await expect(img(page, firstKey)).toHaveAttribute('src', PHOTO)
    const styles = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>('img[data-mdt-content]')]
        .filter((el) => !el.closest('#realisations'))
        .map((el) => ({
          key: el.dataset.mdtContent,
          style: el.getAttribute('style'),
          zoom: el.dataset.mdtZoom,
        })),
    )
    for (const { key, style, zoom } of styles) {
      const expected =
        key === 'accueil.hero.photo'
          ? 'object-position: 41% 52%;'
          : key === 'accueil.parcours.04.photo'
            ? 'object-position: 57.27% 71.45%;'
            : 'object-position: 50% 50%;'
      expect(style, key).toBe(expected)
      expect(zoom, key).toBeUndefined()
    }
  }
})

test('CA-06 — zoomée, la photo garde ses effets : décalage de la photo du milieu et survol', async ({
  page,
}) => {
  await mockSupabase(page, {
    content: {
      atelier: [
        photo('atelier.priva.photo2', [50, 50], 2),
        photo('atelier.ch02.photo', [50, 50], 2),
      ],
    },
  })
  await page.goto(PAGES.atelier)
  const middle = img(page, 'atelier.priva.photo2')
  await expect(middle).toHaveAttribute('data-mdt-zoom', '2')
  expect(await middle.evaluate((el) => getComputedStyle(el).transform)).toBe(
    'matrix(1, 0, 0, 1, 0, -14)',
  )
  const arch = img(page, 'atelier.ch02.photo')
  await arch.scrollIntoViewIfNeeded()
  await arch.hover()
  await expect
    .poll(() => arch.evaluate((el) => getComputedStyle(el).transform))
    .toBe('matrix(1.035, 0, 0, 1.035, 0, 0)')
})

// ---------- v2 : dézoom jusqu'à « Photo entière », bande remplie de la couleur des bords ----------

const CREAM = [246, 239, 220] as const
const GREEN = [46, 90, 50] as const

/** Couleur moyenne [r, g, b] d'une petite zone de l'écran. */
async function averageColor(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  const shot = (await page.screenshot({ clip })).toString('base64')
  return page.evaluate(async (data) => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas indisponible')
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const sum = [0, 0, 0]
    for (let i = 0; i < pixels.length; i += 4) {
      for (let c = 0; c < 3; c += 1) sum[c] = (sum[c] ?? 0) + (pixels[i + c] ?? 0)
    }
    return sum.map((value) => value / (pixels.length / 4))
  }, shot)
}

/** Zone de contenu (où la photo est peinte) de la balise, en coordonnées d'écran. */
function contentBox(target: ReturnType<typeof img>) {
  return target.evaluate((el: HTMLElement) => {
    const style = getComputedStyle(el)
    const px = (value: string) => parseFloat(value) || 0
    const rect = el.getBoundingClientRect()
    return {
      left: rect.left + px(style.borderLeftWidth) + px(style.paddingLeft),
      top: rect.top + px(style.borderTopWidth) + px(style.paddingTop),
      width: el.clientWidth - px(style.paddingLeft) - px(style.paddingRight),
      height: el.clientHeight - px(style.paddingTop) - px(style.paddingBottom),
    }
  })
}

const gap = (a: readonly number[], b: readonly number[]) =>
  [0, 1, 2].reduce((sum, c) => sum + Math.abs((a[c] ?? 0) - (b[c] ?? 0)), 0) / 3

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  test(`CA-05 v2 — à ${viewport.width} px, « Photo entière » : rien n’est coupé, bande remplie`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const key = 'atelier.ch01.photo'
    const capture = capturePng(800, 500, {
      background: CREAM,
      content: [40, 50, 40],
      border: { color: GREEN, size: 16 },
    })
    await page.route('**/fixture/bordee.png', (route) =>
      route.fulfill({ contentType: 'image/png', body: capture.png }),
    )
    await mockSupabase(page, {
      content: {
        atelier: [photo(key, [50, 100], 0, '/fixture/bordee.png', '#fbf7ec')],
      },
    })
    await page.goto(PAGES.atelier)
    const target = img(page, key)
    await expect(target).toHaveAttribute('data-mdt-zoom', '0')
    // Même rendu que le calcul de l'admin, bande comprise.
    expect(await differenceWithAdminFraming(page, target, 0, [50, 100], '#fbf7ec')).toBeLessThan(6)
    // Photo entière : sa bordure verte est visible à gauche ET à droite, à mi-hauteur de la photo.
    const box = await contentBox(target)
    const photoHeight = box.width / 1.6
    const y = Math.round(box.top + box.height - photoHeight / 2)
    const left = await averageColor(page, { x: Math.round(box.left + 2), y, width: 2, height: 2 })
    const right = await averageColor(page, {
      x: Math.round(box.left + box.width - 4),
      y,
      width: 2,
      height: 2,
    })
    expect(gap(left, GREEN)).toBeLessThan(25)
    expect(gap(right, GREEN)).toBeLessThan(25)
  })
}

test('CA-08 — fond uni : la bande de remplissage ne se distingue pas du bord de la photo', async ({
  page,
}) => {
  const key = 'atelier.ch01.photo'
  const capture = capturePng(800, 500, { background: CREAM, content: [40, 50, 40] })
  // Couleur calculée par l'admin sur les bords de cette même image.
  const fill = edgeColor(capture.pixels, 800, 500)
  expect(fill).toBe('#f6efdc')
  await page.route('**/fixture/capture.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: capture.png }),
  )
  const junctionGap = async (imageFill: string | null) => {
    await mockSupabase(page, {
      content: {
        atelier: [photo(key, [50, 100], 0, '/fixture/capture.png', imageFill)],
      },
    })
    await page.goto(PAGES.atelier)
    const target = img(page, key)
    await expect(target).toHaveAttribute('data-mdt-zoom', '0')
    await differenceWithAdminFraming(page, target, 0, [50, 100], fill) // attend la fin des apparitions
    const box = await contentBox(target)
    const junction = box.top + box.height - box.width / 1.6
    const strip = (y: number) => ({
      x: Math.round(box.left + box.width * 0.2),
      y: Math.round(y),
      width: Math.round(box.width * 0.6),
      height: 1,
    })
    return gap(
      await averageColor(page, strip(junction - 3)),
      await averageColor(page, strip(junction + 3)),
    )
  }
  expect(await junctionGap(fill)).toBeLessThan(3)
  // Témoin : sans couleur enregistrée (crème du site), l'écart se voit et la mesure le détecte.
  expect(await junctionGap(null)).toBeGreaterThan(3)
})

test('CA-05 v2 — sous 100 %, photo et remplissage restent dans la zone de la photo (passe-partout)', async ({
  page,
}) => {
  const key = 'atelier.priva.photo1'
  await mockSupabase(page, { content: { atelier: [photo(key, [50, 50], 1)] } })
  await page.goto(PAGES.atelier)
  const layoutSize = (el: HTMLElement) => [el.offsetWidth, el.offsetHeight]
  const before = await img(page, key).evaluate(layoutSize)

  await mockSupabase(page, {
    content: { atelier: [photo(key, [50, 50], 0, PHOTO, '#123456')] },
  })
  await page.goto(PAGES.atelier)
  const target = img(page, key)
  await expect(target).toHaveAttribute('data-mdt-zoom', '0')
  expect(await target.evaluate(layoutSize)).toEqual(before)
  const style = await target.evaluate((el) => {
    const s = getComputedStyle(el)
    return { clip: s.backgroundClip, origin: s.backgroundOrigin, image: s.backgroundImage }
  })
  expect(style.clip).toBe('content-box, content-box, border-box')
  expect(style.origin).toBe('content-box, content-box, padding-box')
  expect(style.image).toContain('linear-gradient(rgb(18, 52, 86), rgb(18, 52, 86))')
})
