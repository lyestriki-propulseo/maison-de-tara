import { crc32, deflateSync } from 'node:zlib'

// Images de test fabriquées à la volée (US-003 v2) : une « capture » à fond uni, avec un bloc
// sombre au centre (le contenu) et, au besoin, une bordure d'une autre couleur. PNG sans perte :
// les couleurs des bords sont exactes. Renvoie aussi les pixels RGBA, pour le calcul de l'admin.

type Rgb = readonly [number, number, number]

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

export function capturePng(
  width: number,
  height: number,
  {
    background,
    content,
    border,
  }: { background: Rgb; content: Rgb; border?: { color: Rgb; size: number } },
) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  const rows: Buffer[] = []
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4) // octet de filtre 0, puis RGBA
    for (let x = 0; x < width; x += 1) {
      const inBorder =
        border &&
        (x < border.size ||
          y < border.size ||
          x >= width - border.size ||
          y >= height - border.size)
      const inContent = x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7
      const [r, g, b] = inBorder ? border.color : inContent ? content : background
      pixels.set([r, g, b, 255], (y * width + x) * 4)
      row.set([r, g, b, 255], 1 + x * 4)
    }
    rows.push(row)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 6, 0, 0, 0], 8) // 8 bits, RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return { png, pixels }
}
