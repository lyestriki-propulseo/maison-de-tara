import { z } from 'zod'

// Contenu éditable du site (photos + textes), page par page. Voir migration
// 20260819090000_content_blocks.sql et js/site-content.js côté site.

export const CONTENT_PAGES = [
  { value: 'accueil', label: 'Accueil' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'calendrier', label: 'Calendrier' },
  { value: 'contact', label: 'Contact' },
  { value: 'histoire', label: 'Histoire' },
] as const

export type ContentPage = (typeof CONTENT_PAGES)[number]['value']

export function contentPageLabel(value: string): string {
  return CONTENT_PAGES.find((p) => p.value === value)?.label ?? value
}

export const updateContentTextSchema = z.object({
  id: z.uuid(),
  textValue: z.string().trim().max(4000),
})

export const updateContentImageSchema = z.object({
  id: z.uuid(),
  dataUrl: z.string().startsWith('data:image/'),
  caption: z.string().trim().max(200).optional(),
})
