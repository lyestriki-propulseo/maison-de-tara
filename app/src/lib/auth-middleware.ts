import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Garde d'authentification pour les FONCTIONS SERVEUR de l'admin.
// Le garde de route (requireSession) ne protège que la PAGE ; les endpoints des server functions
// sont appelables directement. Sans ce middleware, n'importe qui pourrait lire/écrire les données
// admin (dont des données clients — RGPD). Ici : le client joint son jeton Supabase, le serveur le
// vérifie et exige un rôle staff/admin avant d'exécuter le handler.
export const staffMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    const { data } = await supabaseBrowser().auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  })
  .server(async ({ next }) => {
    const header = getRequestHeader('authorization') ?? ''
    const token = header.replace(/^Bearer\s+/i, '').trim()
    if (!token) throw new Error('Non authentifié.')

    const admin = supabaseAdmin()
    const { data: userData, error } = await admin.auth.getUser(token)
    if (error || !userData.user) throw new Error('Session invalide ou expirée.')

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profileError) throw new Error('Vérification du rôle impossible.')
    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      throw new Error('Accès réservé au personnel de la Maison de Tara.')
    }

    return next({ context: { userId: userData.user.id, role: profile.role } })
  })
