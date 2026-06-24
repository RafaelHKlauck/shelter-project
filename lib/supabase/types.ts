export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      animal_media: {
        Row: {
          animal_id: string
          created_at: string
          id: string
          position: number
          url: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          id?: string
          position?: number
          url: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_media_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          breed: string | null
          cover_url: string | null
          created_at: string
          estimated_age_months: number
          health_notes: string | null
          id: string
          name: string | null
          neutered: boolean
          shelter_id: string
          size: Database["public"]["Enums"]["animal_size"]
          species: Database["public"]["Enums"]["animal_species"]
          status: Database["public"]["Enums"]["animal_status"]
          temperament: string[] | null
          updated_at: string
        }
        Insert: {
          breed?: string | null
          cover_url?: string | null
          created_at?: string
          estimated_age_months: number
          health_notes?: string | null
          id?: string
          name?: string | null
          neutered?: boolean
          shelter_id: string
          size: Database["public"]["Enums"]["animal_size"]
          species: Database["public"]["Enums"]["animal_species"]
          status?: Database["public"]["Enums"]["animal_status"]
          temperament?: string[] | null
          updated_at?: string
        }
        Update: {
          breed?: string | null
          cover_url?: string | null
          created_at?: string
          estimated_age_months?: number
          health_notes?: string | null
          id?: string
          name?: string | null
          neutered?: boolean
          shelter_id?: string
          size?: Database["public"]["Enums"]["animal_size"]
          species?: Database["public"]["Enums"]["animal_species"]
          status?: Database["public"]["Enums"]["animal_status"]
          temperament?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          request_id: string
          requester_id: string
          requester_last_read_at: string | null
          shelter_id: string
          shelter_last_read_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          request_id: string
          requester_id: string
          requester_last_read_at?: string | null
          shelter_id: string
          shelter_last_read_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          request_id?: string
          requester_id?: string
          requester_last_read_at?: string | null
          shelter_id?: string
          shelter_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          shelter_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload: Json
          read_at?: string | null
          shelter_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          shelter_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string
          address_line: string
          address_number: string | null
          address_state: string
          address_zip: string
          avatar_url: string | null
          birth_date: string
          cpf_encrypted: string | null
          cpf_hash: string
          created_at: string
          full_name: string
          housing_type: Database["public"]["Enums"]["housing_type"]
          id: string
          location: unknown
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          address_city: string
          address_line: string
          address_number?: string | null
          address_state: string
          address_zip: string
          avatar_url?: string | null
          birth_date: string
          cpf_encrypted?: string | null
          cpf_hash: string
          created_at?: string
          full_name: string
          housing_type: Database["public"]["Enums"]["housing_type"]
          id: string
          location?: unknown
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          address_city?: string
          address_line?: string
          address_number?: string | null
          address_state?: string
          address_zip?: string
          avatar_url?: string | null
          birth_date?: string
          cpf_encrypted?: string | null
          cpf_hash?: string
          created_at?: string
          full_name?: string
          housing_type?: Database["public"]["Enums"]["housing_type"]
          id?: string
          location?: unknown
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          animal_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          finalized_at: string | null
          id: string
          kind: Database["public"]["Enums"]["request_kind"]
          message: string | null
          quantity_offered: number | null
          requester_id: string
          shelter_id: string
          status: Database["public"]["Enums"]["request_status"]
          supply_need_id: string | null
          updated_at: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          finalized_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["request_kind"]
          message?: string | null
          quantity_offered?: number | null
          requester_id: string
          shelter_id: string
          status?: Database["public"]["Enums"]["request_status"]
          supply_need_id?: string | null
          updated_at?: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          finalized_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          message?: string | null
          quantity_offered?: number | null
          requester_id?: string
          shelter_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          supply_need_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_supply_need_id_fkey"
            columns: ["supply_need_id"]
            isOneToOne: false
            referencedRelation: "supply_needs"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_media: {
        Row: {
          created_at: string
          id: string
          position: number
          shelter_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          shelter_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          shelter_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_media_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_members: {
        Row: {
          created_at: string
          promoted_by: string | null
          role: Database["public"]["Enums"]["shelter_role"]
          shelter_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          promoted_by?: string | null
          role: Database["public"]["Enums"]["shelter_role"]
          shelter_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          promoted_by?: string | null
          role?: Database["public"]["Enums"]["shelter_role"]
          shelter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_members_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          address_city: string
          address_line: string
          address_state: string
          address_zip: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          location: unknown
          name: string
          needs_supplies: boolean
          phone: string
          slug: string
          updated_at: string
        }
        Insert: {
          address_city: string
          address_line: string
          address_state: string
          address_zip: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location: unknown
          name: string
          needs_supplies?: boolean
          phone: string
          slug: string
          updated_at?: string
        }
        Update: {
          address_city?: string
          address_line?: string
          address_state?: string
          address_zip?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: unknown
          name?: string
          needs_supplies?: boolean
          phone?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      supply_needs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          quantity_fulfilled: number
          quantity_target: number | null
          shelter_id: string
          status: Database["public"]["Enums"]["supply_status"]
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          quantity_fulfilled?: number
          quantity_target?: number | null
          shelter_id: string
          status?: Database["public"]["Enums"]["supply_status"]
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          quantity_fulfilled?: number
          quantity_target?: number | null
          shelter_id?: string
          status?: Database["public"]["Enums"]["supply_status"]
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_needs_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      animals_feed: {
        Args: {
          p_max_km?: number
          p_search?: string
          p_size?: string
          p_species?: string
        }
        Returns: {
          breed: string
          cover_url: string
          distance_km: number
          estimated_age_months: number
          id: string
          name: string
          neutered: boolean
          shelter_id: string
          shelter_name: string
          size: Database["public"]["Enums"]["animal_size"]
          species: Database["public"]["Enums"]["animal_species"]
        }[]
      }
      f_distance_km: { Args: { a: unknown; b: unknown }; Returns: number }
      get_requester_history: {
        Args: { p_exclude_shelter_id?: string; p_requester_id: string }
        Returns: {
          animal_name: string
          created_at: string
          decided_at: string
          finalized_at: string
          kind: Database["public"]["Enums"]["request_kind"]
          request_id: string
          shelter_id: string
          shelter_name: string
          status: Database["public"]["Enums"]["request_status"]
        }[]
      }
      is_member: {
        Args: {
          p_roles: Database["public"]["Enums"]["shelter_role"][]
          p_shelter: string
          p_user: string
        }
        Returns: boolean
      }
      shelter_has_request_from: {
        Args: { p_shelter: string; p_user: string }
        Returns: boolean
      }
      shelters_feed: {
        Args: { p_max_km?: number; p_search?: string }
        Returns: {
          animals_count: number
          cover_url: string
          description: string
          distance_km: number
          id: string
          name: string
          needs_supplies: boolean
        }[]
      }
      unread_count: {
        Args: { p_conv: string; p_role: string }
        Returns: number
      }
    }
    Enums: {
      animal_size: "small" | "medium" | "large"
      animal_species: "dog" | "cat" | "other"
      animal_status: "available" | "reserved" | "adopted" | "unavailable"
      housing_type: "house" | "apartment"
      request_kind: "adoption" | "volunteer" | "supply"
      request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "finalized"
        | "cancelled"
      shelter_role: "admin" | "editor" | "volunteer"
      supply_status: "open" | "in_progress" | "fulfilled" | "cancelled"
      user_role: "user" | "shelter_team"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
