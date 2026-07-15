import { verifyMac } from '@/lib/monetico/signature'

export function buildReturnMacString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key !== 'MAC')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('*')
}

export function verifyReturn(cle: string, params: Record<string, string>, mac: string): boolean {
  return verifyMac(cle, buildReturnMacString(params), mac)
}

export function ackResponse(ok: boolean): string {
  return ok ? 'version=2\ncdr=0' : 'version=2\ncdr=1'
}
