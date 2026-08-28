// Généré par scripts/gen-types.mjs (introspection de la base). Ne pas éditer à la main.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      content_blocks: {
        Row: {
          id: string
          page: string
          section: string
          field_key: string
          field_type: Database['public']['Enums']['content_field_type']
          label: string
          text_value: string | null
          image_path: string | null
          image_caption: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          id?: string
          page: string
          section: string
          field_key: string
          field_type: Database['public']['Enums']['content_field_type']
          label: string
          text_value?: string | null
          image_path?: string | null
          image_caption?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          id?: string
          page?: string
          section?: string
          field_key?: string
          field_type?: Database['public']['Enums']['content_field_type']
          label?: string
          text_value?: string | null
          image_path?: string | null
          image_caption?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          slug: string
          title: string
          event_type: Database['public']['Enums']['event_type']
          description: string | null
          starts_at: string
          ends_at: string | null
          capacity: number
          image_path: string | null
          deposit_enabled: boolean
          deposit_amount_cents: number | null
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          event_type?: Database['public']['Enums']['event_type']
          description?: string | null
          starts_at: string
          ends_at?: string | null
          capacity: number
          image_path?: string | null
          deposit_enabled?: boolean
          deposit_amount_cents?: number | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          event_type?: Database['public']['Enums']['event_type']
          description?: string | null
          starts_at?: string
          ends_at?: string | null
          capacity?: number
          image_path?: string | null
          deposit_enabled?: boolean
          deposit_amount_cents?: number | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          id: string
          image_path: string
          caption: string | null
          tag: string | null
          size: Database['public']['Enums']['gallery_size']
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          image_path: string
          caption?: string | null
          tag?: string | null
          size?: Database['public']['Enums']['gallery_size']
          sort_order?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          image_path?: string
          caption?: string | null
          tag?: string | null
          size?: Database['public']['Enums']['gallery_size']
          sort_order?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_card_redemptions: {
        Row: {
          id: string
          gift_card_id: string
          amount_cents: number | null
          note: string | null
          redeemed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          gift_card_id: string
          amount_cents?: number | null
          note?: string | null
          redeemed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          gift_card_id?: string
          amount_cents?: number | null
          note?: string | null
          redeemed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          id: string
          code: string
          gift_type: Database['public']['Enums']['gift_card_type']
          label: string | null
          initial_amount_cents: number | null
          balance_cents: number | null
          status: Database['public']['Enums']['gift_card_status']
          valid_until: string
          purchaser_name: string | null
          purchaser_email: string | null
          recipient_name: string | null
          message: string | null
          payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          gift_type: Database['public']['Enums']['gift_card_type']
          label?: string | null
          initial_amount_cents?: number | null
          balance_cents?: number | null
          status?: Database['public']['Enums']['gift_card_status']
          valid_until: string
          purchaser_name?: string | null
          purchaser_email?: string | null
          recipient_name?: string | null
          message?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          gift_type?: Database['public']['Enums']['gift_card_type']
          label?: string | null
          initial_amount_cents?: number | null
          balance_cents?: number | null
          status?: Database['public']['Enums']['gift_card_status']
          valid_until?: string
          purchaser_name?: string | null
          purchaser_email?: string | null
          recipient_name?: string | null
          message?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_posts: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string | null
          cover_image_path: string | null
          body: string | null
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          excerpt?: string | null
          cover_image_path?: string | null
          body?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          excerpt?: string | null
          cover_image_path?: string | null
          body?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          status: Database['public']['Enums']['subscriber_status']
          confirm_token: string
          confirmed_at: string | null
          synced_to_brevo: boolean
          created_at: string
          updated_at: string
          notified_at: string | null
        }
        Insert: {
          id?: string
          email: string
          status?: Database['public']['Enums']['subscriber_status']
          confirm_token?: string
          confirmed_at?: string | null
          synced_to_brevo?: boolean
          created_at?: string
          updated_at?: string
          notified_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          status?: Database['public']['Enums']['subscriber_status']
          confirm_token?: string
          confirmed_at?: string | null
          synced_to_brevo?: boolean
          created_at?: string
          updated_at?: string
          notified_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          kind: Database['public']['Enums']['payment_kind']
          reference: string
          amount_cents: number
          currency: string
          status: Database['public']['Enums']['payment_status']
          monetico_code_retour: string | null
          monetico_payload: Json | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kind: Database['public']['Enums']['payment_kind']
          reference: string
          amount_cents: number
          currency?: string
          status?: Database['public']['Enums']['payment_status']
          monetico_code_retour?: string | null
          monetico_payload?: Json | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kind?: Database['public']['Enums']['payment_kind']
          reference?: string
          amount_cents?: number
          currency?: string
          status?: Database['public']['Enums']['payment_status']
          monetico_code_retour?: string | null
          monetico_payload?: Json | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: Database['public']['Enums']['user_role']
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: Database['public']['Enums']['user_role']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: Database['public']['Enums']['user_role']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_availability: {
        Row: {
          id: string | null
          session_date: string | null
          start_time: string | null
          duration_minutes: number | null
          availability: string | null
        }
        Insert: {
          id?: string | null
          session_date?: string | null
          start_time?: string | null
          duration_minutes?: number | null
          availability?: string | null
        }
        Update: {
          id?: string | null
          session_date?: string | null
          start_time?: string | null
          duration_minutes?: number | null
          availability?: string | null
        }
        Relationships: []
      }
      public_availability_events: {
        Row: {
          id: string | null
          slug: string | null
          title: string | null
          event_type: Database['public']['Enums']['event_type'] | null
          description: string | null
          starts_at: string | null
          ends_at: string | null
          image_path: string | null
          availability: string | null
        }
        Insert: {
          id?: string | null
          slug?: string | null
          title?: string | null
          event_type?: Database['public']['Enums']['event_type'] | null
          description?: string | null
          starts_at?: string | null
          ends_at?: string | null
          image_path?: string | null
          availability?: string | null
        }
        Update: {
          id?: string | null
          slug?: string | null
          title?: string | null
          event_type?: Database['public']['Enums']['event_type'] | null
          description?: string | null
          starts_at?: string | null
          ends_at?: string | null
          image_path?: string | null
          availability?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          id: string
          request_type: Database['public']['Enums']['request_type']
          status: Database['public']['Enums']['request_status']
          name: string
          email: string
          phone: string | null
          message: string | null
          party_size: number | null
          desired_date: string | null
          event_type: Database['public']['Enums']['event_type'] | null
          created_at: string
          updated_at: string
          notified_at: string | null
        }
        Insert: {
          id?: string
          request_type: Database['public']['Enums']['request_type']
          status?: Database['public']['Enums']['request_status']
          name: string
          email: string
          phone?: string | null
          message?: string | null
          party_size?: number | null
          desired_date?: string | null
          event_type?: Database['public']['Enums']['event_type'] | null
          created_at?: string
          updated_at?: string
          notified_at?: string | null
        }
        Update: {
          id?: string
          request_type?: Database['public']['Enums']['request_type']
          status?: Database['public']['Enums']['request_status']
          name?: string
          email?: string
          phone?: string | null
          message?: string | null
          party_size?: number | null
          desired_date?: string | null
          event_type?: Database['public']['Enums']['event_type'] | null
          created_at?: string
          updated_at?: string
          notified_at?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string
          session_instance_id: string | null
          event_id: string | null
          party_size: number
          customer_name: string
          customer_email: string
          customer_phone: string | null
          status: Database['public']['Enums']['reservation_status']
          source: Database['public']['Enums']['reservation_source']
          deposit_amount_cents: number
          payment_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          notified_at: string | null
        }
        Insert: {
          id?: string
          session_instance_id?: string | null
          event_id?: string | null
          party_size: number
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          status?: Database['public']['Enums']['reservation_status']
          source?: Database['public']['Enums']['reservation_source']
          deposit_amount_cents?: number
          payment_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          notified_at?: string | null
        }
        Update: {
          id?: string
          session_instance_id?: string | null
          event_id?: string | null
          party_size?: number
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          status?: Database['public']['Enums']['reservation_status']
          source?: Database['public']['Enums']['reservation_source']
          deposit_amount_cents?: number
          payment_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          notified_at?: string | null
        }
        Relationships: []
      }
      session_instances: {
        Row: {
          id: string
          session_date: string
          start_time: string
          duration_minutes: number
          capacity: number
          status: Database['public']['Enums']['slot_status']
          template_id: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_date: string
          start_time: string
          duration_minutes?: number
          capacity: number
          status?: Database['public']['Enums']['slot_status']
          template_id?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_date?: string
          start_time?: string
          duration_minutes?: number
          capacity?: number
          status?: Database['public']['Enums']['slot_status']
          template_id?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_templates: {
        Row: {
          id: string
          weekday: number
          start_time: string
          duration_minutes: number
          capacity: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          weekday: number
          start_time: string
          duration_minutes?: number
          capacity: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          weekday?: number
          start_time?: string
          duration_minutes?: number
          capacity?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      content_field_type: 'text' | 'image'
      event_type: 'workshop' | 'soiree' | 'kids' | 'collaboration' | 'autre'
      gallery_size: 'grande' | 'moyenne' | 'petite'
      gift_card_status: 'active' | 'used' | 'expired' | 'cancelled'
      gift_card_type: 'session' | 'montant'
      payment_kind: 'reservation_deposit' | 'gift_card'
      payment_status: 'pending' | 'paid' | 'refused'
      request_status: 'nouvelle' | 'en_cours' | 'traitee' | 'devis_envoye'
      request_type: 'privatisation' | 'contact'
      reservation_source: 'online' | 'manual'
      reservation_status: 'pending' | 'confirmed' | 'cancelled' | 'no_show'
      slot_status: 'open' | 'blocked'
      subscriber_status: 'pending' | 'confirmed' | 'unsubscribed'
      user_role: 'admin' | 'staff' | 'client'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
