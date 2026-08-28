import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'
import { updateContentImageSchema, updateContentTextSchema } from '@/lib/content'

// CRUD du contenu éditable du site (photos + textes). Écran unique /admin/contenu, filtré par
// page côté client. Le site public lit séparément en anon (RLS), voir js/site-content.js.

function throwDatabaseError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

export const listContentBlocks = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('content_blocks')
      .select('id, page, section, field_key, field_type, label, text_value, image_path, image_caption, sort_order')
      .order('page')
      .order('sort_order')
    throwDatabaseError(error, 'Impossible de charger le contenu du site')
    return (data ?? []).map((row) => ({
      id: row.id,
      page: row.page,
      section: row.section,
      fieldKey: row.field_key,
      fieldType: row.field_type,
      label: row.label,
      textValue: row.text_value,
      imagePath: row.image_path,
      imageCaption: row.image_caption,
      sortOrder: row.sort_order,
    }))
  })

export const updateContentText = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(updateContentTextSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { error } = await db
      .from('content_blocks')
      .update({ text_value: data.textValue || null })
      .eq('id', data.id)
    throwDatabaseError(error, 'Impossible d’enregistrer ce texte')
    return { id: data.id }
  })

function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl)
  const contentType = match?.[1]
  const base64 = match?.[2]
  if (!contentType || !base64) throw new Error('Image invalide')
  return { contentType, buffer: Buffer.from(base64, 'base64') }
}

export const updateContentImage = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .validator(updateContentImageSchema)
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: block, error: blockError } = await db
      .from('content_blocks')
      .select('page, field_key')
      .eq('id', data.id)
      .single()
    throwDatabaseError(blockError, 'Champ introuvable')
    if (!block) throw new Error('Champ introuvable')

    const { buffer, contentType } = decodeDataUrl(data.dataUrl)
    const extension = contentType.split('/')[1] ?? 'jpg'
    const path = `content/${block.page}/${block.field_key}-${crypto.randomUUID().slice(0, 8)}.${extension}`

    const { error: uploadError } = await db.storage
      .from('medias')
      .upload(path, buffer, { contentType, upsert: false })
    throwDatabaseError(uploadError, 'Impossible d’envoyer la photo')

    const { data: publicUrl } = db.storage.from('medias').getPublicUrl(path)

    const { error } = await db
      .from('content_blocks')
      .update({ image_path: publicUrl.publicUrl, image_caption: data.caption || null })
      .eq('id', data.id)
    throwDatabaseError(error, 'Impossible d’enregistrer la photo')
    return { id: data.id, imagePath: publicUrl.publicUrl }
  })
