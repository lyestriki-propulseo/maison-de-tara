import { createFileRoute } from '@tanstack/react-router'
import { AdminDesignPreview } from '@/components/admin/AdminDesignPreview'

export const Route = createFileRoute('/admin-preview')({
  component: AdminDesignPreview,
})
