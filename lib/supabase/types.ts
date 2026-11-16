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
          location?: unknown
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
      shift_attendance_log: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string | null
          enrollment_id: string
          id: string
          marked_at: string
          marked_by: string
          new_status: Database["public"]["Enums"]["enrollment_status"]
          previous_status:
            | Database["public"]["Enums"]["enrollment_status"]
            | null
          worked_minutes: number
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          enrollment_id: string
          id?: string
          marked_at?: string
          marked_by: string
          new_status: Database["public"]["Enums"]["enrollment_status"]
          previous_status?:
            | Database["public"]["Enums"]["enrollment_status"]
            | null
          worked_minutes: number
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          enrollment_id?: string
          id?: string
          marked_at?: string
          marked_by?: string
          new_status?: Database["public"]["Enums"]["enrollment_status"]
          previous_status?:
            | Database["public"]["Enums"]["enrollment_status"]
            | null
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_attendance_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "shift_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_enrollments: {
        Row: {
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          enrolled_at: string
          id: string
          reminder_sent_at: string | null
          shift_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
          waitlist_position: number | null
          worked_minutes: number
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          reminder_sent_at?: string | null
          shift_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
          waitlist_position?: number | null
          worked_minutes?: number
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          reminder_sent_at?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
          waitlist_position?: number | null
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_enrollments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "volunteer_shifts"
            referencedColumns: ["id"]
          },
        ]
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
      volunteer_blocks: {
        Row: {
          blocked_until: string
          created_at: string
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          shelter_id: string
          user_id: string
        }
        Insert: {
          blocked_until: string
          created_at?: string
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          shelter_id: string
          user_id: string
        }
        Update: {
          blocked_until?: string
          created_at?: string
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          shelter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_blocks_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_certificates: {
        Row: {
          code: string
          cpf_masked: string | null
          file_path: string | null
          id: string
          issued_at: string
          period_end: string
          period_start: string
          shelter_id: string
          shelter_name: string
          shifts_count: number
          total_minutes: number
          user_id: string
          volunteer_name: string
        }
        Insert: {
          code: string
          cpf_masked?: string | null
          file_path?: string | null
          id?: string
          issued_at?: string
          period_end: string
          period_start: string
          shelter_id: string
          shelter_name: string
          shifts_count: number
          total_minutes: number
          user_id: string
          volunteer_name: string
        }
        Update: {
          code?: string
          cpf_masked?: string | null
          file_path?: string | null
          id?: string
          issued_at?: string
          period_end?: string
          period_start?: string
          shelter_id?: string
          shelter_name?: string
          shifts_count?: number
          total_minutes?: number
          user_id?: string
          volunteer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_certificates_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_shifts: {
        Row: {
          cancelled_at: string | null
          capacity: number
          confirmed_count: number
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          recurrence_group_id: string | null
          shelter_id: string
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          task_type: Database["public"]["Enums"]["shift_task"]
          title: string
          updated_at: string
          waitlist_count: number
        }
        Insert: {
          cancelled_at?: string | null
          capacity: number
          confirmed_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          recurrence_group_id?: string | null
          shelter_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["shift_status"]
          task_type?: Database["public"]["Enums"]["shift_task"]
          title: string
          updated_at?: string
          waitlist_count?: number
        }
        Update: {
          cancelled_at?: string | null
          capacity?: number
          confirmed_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          recurrence_group_id?: string | null
          shelter_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["shift_status"]
          task_type?: Database["public"]["Enums"]["shift_task"]
          title?: string
          updated_at?: string
          waitlist_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_shifts_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _vs_fail: {
        Args: { p_hint?: string; p_message: string }
        Returns: undefined
      }
      _vs_fmt: { Args: { p_ts: string }; Returns: string }
      _vs_new_certificate_code: { Args: never; Returns: string }
      _vs_notify: {
        Args: {
          p_extra?: Json
          p_kind: string
          p_shift: Database["public"]["Tables"]["volunteer_shifts"]["Row"]
          p_user: string
        }
        Returns: undefined
      }
      _vs_refresh_shift: { Args: { p_shift_id: string }; Returns: undefined }
      _vs_validate_shift: {
        Args: { p_capacity: number; p_ends_at: string; p_starts_at: string }
        Returns: undefined
      }
      active_volunteer_block: {
        Args: { p_shelter: string; p_user: string }
        Returns: {
          blocked_until: string
          created_at: string
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          shelter_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "volunteer_blocks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      attach_certificate_file: {
        Args: { p_certificate_id: string; p_file_path: string }
        Returns: undefined
      }
      cancel_enrollment: { Args: { p_enrollment_id: string }; Returns: Json }
      cancel_shift: {
        Args: { p_shift_id: string; p_whole_series?: boolean }
        Returns: number
      }
      complete_finished_shifts: { Args: never; Returns: number }
      compute_worked_minutes: {
        Args: {
          p_checked_in_at: string
          p_checked_out_at: string
          p_ends_at: string
          p_starts_at: string
          p_status: Database["public"]["Enums"]["enrollment_status"]
        }
        Returns: number
      }
      create_shift: {
        Args: {
          p_capacity: number
          p_description: string
          p_ends_at: string
          p_repeat_weeks?: number
          p_shelter_id: string
          p_starts_at: string
          p_task_type: Database["public"]["Enums"]["shift_task"]
          p_title: string
        }
        Returns: {
          cancelled_at: string | null
          capacity: number
          confirmed_count: number
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          recurrence_group_id: string | null
          shelter_id: string
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          task_type: Database["public"]["Enums"]["shift_task"]
          title: string
          updated_at: string
          waitlist_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "volunteer_shifts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_shift: { Args: { p_shift_id: string }; Returns: undefined }
      enroll_in_shift: { Args: { p_shift_id: string }; Returns: Json }
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
      is_shelter_coordinator: {
        Args: { p_shelter: string; p_user: string }
        Returns: boolean
      }
      is_teammate: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: boolean
      }
      issue_certificate: {
        Args: { p_from: string; p_shelter_id: string; p_to: string }
        Returns: {
          code: string
          cpf_masked: string | null
          file_path: string | null
          id: string
          issued_at: string
          period_end: string
          period_start: string
          shelter_id: string
          shelter_name: string
          shifts_count: number
          total_minutes: number
          user_id: string
          volunteer_name: string
        }
        SetofOptions: {
          from: "*"
          to: "volunteer_certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lift_volunteer_block: {
        Args: { p_block_id: string }
        Returns: {
          blocked_until: string
          created_at: string
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          shelter_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "volunteer_blocks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_attendance: {
        Args: {
          p_checked_in_at?: string
          p_checked_out_at?: string
          p_enrollment_id: string
          p_status: Database["public"]["Enums"]["enrollment_status"]
        }
        Returns: {
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          enrolled_at: string
          id: string
          reminder_sent_at: string | null
          shift_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
          waitlist_position: number | null
          worked_minutes: number
        }
        SetofOptions: {
          from: "*"
          to: "shift_enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mask_cpf: { Args: { p_cpf: string }; Returns: string }
      promote_waitlist: { Args: { p_shift_id: string }; Returns: number }
      release_enrollment: { Args: { p_enrollment_id: string }; Returns: Json }
      send_shift_reminders: { Args: never; Returns: number }
      shelter_has_request_from: {
        Args: { p_shelter: string; p_user: string }
        Returns: boolean
      }
      shelter_schedule_indicators: {
        Args: { p_shelter_id: string }
        Returns: Json
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
      update_shift: {
        Args: {
          p_capacity: number
          p_description: string
          p_ends_at: string
          p_shift_id: string
          p_starts_at: string
          p_task_type: Database["public"]["Enums"]["shift_task"]
          p_title: string
        }
        Returns: {
          cancelled_at: string | null
          capacity: number
          confirmed_count: number
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          recurrence_group_id: string | null
          shelter_id: string
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          task_type: Database["public"]["Enums"]["shift_task"]
          title: string
          updated_at: string
          waitlist_count: number
        }
        SetofOptions: {
          from: "*"
          to: "volunteer_shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_certificate: {
        Args: { p_code: string }
        Returns: {
          code: string
          cpf_masked: string
          issued_at: string
          period_end: string
          period_start: string
          shelter_name: string
          shifts_count: number
          total_minutes: number
          volunteer_name: string
        }[]
      }
      volunteer_hours_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          shelter_id: string
          shelter_name: string
          shifts_count: number
          total_minutes: number
        }[]
      }
    }
    Enums: {
      animal_size: "small" | "medium" | "large"
      animal_species: "dog" | "cat" | "other"
      animal_status: "available" | "reserved" | "adopted" | "unavailable"
      enrollment_status:
        | "confirmed"
        | "waitlisted"
        | "cancelled"
        | "attended"
        | "absent"
        | "excused"
      housing_type: "house" | "apartment"
      request_kind: "adoption" | "volunteer" | "supply"
      request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "finalized"
        | "cancelled"
      shelter_role: "admin" | "editor" | "volunteer"
      shift_status: "scheduled" | "cancelled" | "completed"
      shift_task: "walk" | "cleaning" | "care" | "event" | "other"
      supply_status: "open" | "in_progress" | "fulfilled" | "cancelled"
      user_role: "user" | "shelter_team"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      animal_size: ["small", "medium", "large"],
      animal_species: ["dog", "cat", "other"],
      animal_status: ["available", "reserved", "adopted", "unavailable"],
      enrollment_status: [
        "confirmed",
        "waitlisted",
        "cancelled",
        "attended",
        "absent",
        "excused",
      ],
      housing_type: ["house", "apartment"],
      request_kind: ["adoption", "volunteer", "supply"],
      request_status: [
        "pending",
        "accepted",
        "rejected",
        "finalized",
        "cancelled",
      ],
      shelter_role: ["admin", "editor", "volunteer"],
      shift_status: ["scheduled", "cancelled", "completed"],
      shift_task: ["walk", "cleaning", "care", "event", "other"],
      supply_status: ["open", "in_progress", "fulfilled", "cancelled"],
      user_role: ["user", "shelter_team"],
    },
  },
} as const

