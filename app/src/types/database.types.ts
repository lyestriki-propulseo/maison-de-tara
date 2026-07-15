// Placeholder — remplacé par `supabase gen types typescript --project-id <REF>`
// une fois le projet Supabase créé (voir docs/phase-2/2026-07-15-checklist-comptes.md).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
