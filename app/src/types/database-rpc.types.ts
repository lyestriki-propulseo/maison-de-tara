import type { Database } from './database.types'

// Complément au générateur de tables : signatures des migrations SQL existantes.
// Aucun changement de base. Ce fichier ne sera pas écrasé par gen-types.mjs.
export type DatabaseWithRpc = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: {
      check_availability: {
        Args: { p_session_instance_id: string | null; p_event_id: string | null; p_party_size: number }
        Returns: boolean
      }
      confirm_reservation_payment: {
        Args: {
          p_session_instance_id: string | null
          p_event_id: string | null
          p_party_size: number
          p_customer_name: string
          p_customer_email: string
          p_customer_phone: string | null
          p_stripe_checkout_session_id: string
          p_stripe_payment_intent_id: string | null
          p_amount_cents: number
        }
        Returns: string
      }
    }
  }
}
