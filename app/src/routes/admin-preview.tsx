import { createFileRoute } from '@tanstack/react-router'
import { AdminDesignPreview } from '@/components/admin/AdminDesignPreview'

export const Route = createFileRoute('/admin-preview')({
  // Écran de design pur (aperçu client) : rendu client seul pour éviter un SSR
  // qui traîne/plante côté serveur — comme la route /admin (ssr: false).
  ssr: false,
  component: AdminDesignPreview,
})
