import { computeMac } from '@/lib/monetico/signature'

export interface Phase1Input {
  tpe: string
  date: string
  montantCents: number
  devise?: string
  reference: string
  mail: string
  societe: string
  lgue?: string
  version?: string
  urlRetourOk: string
  urlRetourErr: string
  texteLibre?: string
  contexteCommande?: string
}

export function formatMontant(cents: number, devise = 'EUR'): string {
  return (cents / 100).toFixed(2) + devise
}

export function buildMacString(input: Phase1Input): string {
  const fields: Array<[string, string]> = [
    ['TPE', input.tpe],
    ['contexte_commande', input.contexteCommande ?? ''],
    ['date', input.date],
    ['dateech1', ''],
    ['dateech2', ''],
    ['dateech3', ''],
    ['dateech4', ''],
    ['lgue', input.lgue ?? 'FR'],
    ['mail', input.mail],
    ['montant', formatMontant(input.montantCents, input.devise)],
    ['montantech1', ''],
    ['montantech2', ''],
    ['montantech3', ''],
    ['montantech4', ''],
    ['nbrech', ''],
    ['reference', input.reference],
    ['societe', input.societe],
    ['texte-libre', input.texteLibre ?? ''],
    ['url_retour_err', input.urlRetourErr],
    ['url_retour_ok', input.urlRetourOk],
    ['version', input.version ?? '3.0'],
  ]
  return fields.map(([key, value]) => `${key}=${value}`).join('*')
}

export function buildPaymentFields(cle: string, input: Phase1Input): Record<string, string> {
  const mac = computeMac(cle, buildMacString(input))
  return {
    version: input.version ?? '3.0',
    TPE: input.tpe,
    contexte_commande: input.contexteCommande ?? '',
    date: input.date,
    montant: formatMontant(input.montantCents, input.devise),
    reference: input.reference,
    MAC: mac,
    url_retour_ok: input.urlRetourOk,
    url_retour_err: input.urlRetourErr,
    lgue: input.lgue ?? 'FR',
    societe: input.societe,
    'texte-libre': input.texteLibre ?? '',
    mail: input.mail,
  }
}
