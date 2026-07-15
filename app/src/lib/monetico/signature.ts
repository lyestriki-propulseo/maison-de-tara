import { createHmac } from 'node:crypto'

export function getUsableKey(cle: string): Buffer {
  let hexStrKey = cle.slice(0, 38)
  const hexFinal = cle.slice(38, 40) + '00'
  const cca0 = hexFinal.charCodeAt(0)
  if (cca0 > 70 && cca0 < 97) {
    hexStrKey += String.fromCharCode(cca0 - 23) + hexFinal[1]
  } else if (hexFinal[1] === 'M') {
    hexStrKey += hexFinal[0] + '0'
  } else {
    hexStrKey += hexFinal.slice(0, 2)
  }
  return Buffer.from(hexStrKey, 'hex')
}

export function computeMac(cle: string, data: string): string {
  return createHmac('sha1', getUsableKey(cle)).update(Buffer.from(data, 'latin1')).digest('hex')
}

export function verifyMac(cle: string, data: string, mac: string): boolean {
  return computeMac(cle, data) === mac.toLowerCase()
}
