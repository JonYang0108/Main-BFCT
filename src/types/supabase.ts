export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          period_month: number
          period_year: number
          receipt_number: string | null
          receipt_url: string | null
          stall_id: string
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_month: number
          period_year: number
          receipt_number?: string | null
          receipt_url?: string | null
          stall_id: string
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_month?: number
          period_year?: number
          receipt_number?: string | null
          receipt_url?: string | null
          stall_id?: string
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "stalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "v_active_vendors"
            referencedColumns: ["stall_id"]
          },
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "v_stalls_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_overview"
            referencedColumns: ["stall_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          address: string | null
          avatar_url: string | null
          birthdate: string | null
          business_name: string | null
          contact_number: string | null
          created_at: string
          decline_reason: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          address?: string | null
          avatar_url?: string | null
          birthdate?: string | null
          business_name?: string | null
          contact_number?: string | null
          created_at?: string
          decline_reason?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          address?: string | null
          avatar_url?: string | null
          birthdate?: string | null
          business_name?: string | null
          contact_number?: string | null
          created_at?: string
          decline_reason?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stalls: {
        Row: {
          created_at: string
          id: string
          location: string | null
          monthly_rent: number
          notes: string | null
          size: string | null
          stall_number: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          monthly_rent?: number
          notes?: string | null
          size?: string | null
          stall_number: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          monthly_rent?: number
          notes?: string | null
          size?: string | null
          stall_number?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_valid_ids: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string
          file_url: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_requests: {
        Row: {
          address: string
          birthdate: string | null
          business_name: string | null
          created_at: string
          decline_reason: string | null
          email: string
          full_name: string
          id: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          birthdate?: string | null
          business_name?: string | null
          created_at?: string
          decline_reason?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          birthdate?: string | null
          business_name?: string | null
          created_at?: string
          decline_reason?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_account_requests: {
        Row: {
          account_status: string | null
          address: string | null
          age: number | null
          avatar_url: string | null
          birthdate: string | null
          business_name: string | null
          contact_number: string | null
          created_at: string | null
          decline_reason: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          profile_address: string | null
          profile_phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          valid_id_count: number | null
        }
        Relationships: []
      }
      v_active_vendors: {
        Row: {
          account_status: string | null
          address: string | null
          age: number | null
          avatar_url: string | null
          birthdate: string | null
          business_name: string | null
          contact_number: string | null
          created_at: string | null
          decline_reason: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          stall_id: string | null
          stall_number: string | null
          stall_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_admin_overview: {
        Row: {
          active_vendors: number | null
          available_stalls: number | null
          maintenance_stalls: number | null
          occupancy_pct: number | null
          occupied_stalls: number | null
          total_collected: number | null
          total_overdue: number | null
          total_payments: number | null
          total_pending: number | null
          total_stalls: number | null
        }
        Relationships: []
      }
      v_payment_reports: {
        Row: {
          id: string | null
          period_year: number | null
        }
        Insert: {
          id?: string | null
          period_year?: number | null
        }
        Update: {
          id?: string | null
          period_year?: number | null
        }
        Relationships: []
      }
      v_payments_enriched: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          business_name: string | null
          created_at: string | null
          days_until_due: number | null
          due_date: string | null
          id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          period_label: string | null
          period_month: number | null
          period_year: number | null
          phone: string | null
          receipt_number: string | null
          receipt_url: string | null
          stall_id: string | null
          stall_location: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "stalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "v_active_vendors"
            referencedColumns: ["stall_id"]
          },
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "v_stalls_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_overview"
            referencedColumns: ["stall_id"]
          },
        ]
      }
      v_staff_overview: {
        Row: {
          active_stalls: number | null
          maintenance_stalls: number | null
          monthly_revenue: number | null
          todays_revenue: number | null
          todays_txn_count: number | null
          weekly_revenue: number | null
          yearly_revenue: number | null
        }
        Relationships: []
      }
      v_staff_payment_records: {
        Row: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          period_label: string | null
          period_month: number | null
          period_year: number | null
          receipt_number: string | null
          stall_number: string | null
          status: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
      v_stalls_list: {
        Row: {
          business_name: string | null
          created_at: string | null
          id: string | null
          last_payment_date: string | null
          location: string | null
          monthly_rent: number | null
          notes: string | null
          outstanding_balance: number | null
          size: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }
        Relationships: []
      }
      v_vendor_overview: {
        Row: {
          business_name: string | null
          email: string | null
          full_name: string | null
          location: string | null
          monthly_rent: number | null
          next_due_date: string | null
          size: string | null
          stall_id: string | null
          stall_number: string | null
          stall_status: string | null
          total_overdue: number | null
          total_paid: number | null
          total_pending: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_account_request: {
        Args: { _request_id: string }
        Returns: boolean
      }
      approve_payment: {
        Args: { _approved_by: string; _payment_id: string }
        Returns: boolean
      }
      approve_vendor_request: {
        Args: { _request_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _message: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      decline_account_request: {
        Args: { _reason: string; _request_id: string }
        Returns: boolean
      }
      decline_vendor_request: {
        Args: { _decline_reason: string; _request_id: string }
        Returns: boolean
      }
      fn_account_requests_list: {
        Args: { _search?: string; _status?: string }
        Returns: {
          address: string
          age: number
          birthdate: string
          business_name: string
          contact_number: string
          created_at: string
          decline_reason: string
          email: string
          full_name: string
          id: string
          phone: string
          status: string
          updated_at: string
          user_id: string
          valid_id_count: number
        }[]
      }
      fn_admin_overview: {
        Args: never
        Returns: {
          active_vendors: number
          available_stalls: number
          maintenance_stalls: number
          occupancy_pct: number
          occupied_stalls: number
          total_collected: number
          total_overdue: number
          total_payments: number
          total_pending: number
          total_stalls: number
        }[]
      }
      fn_admin_payments_list: {
        Args: {
          _month?: number
          _search?: string
          _status?: string
          _year?: number
        }
        Returns: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          business_name: string | null
          created_at: string | null
          days_until_due: number | null
          due_date: string | null
          id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          period_label: string | null
          period_month: number | null
          period_year: number | null
          phone: string | null
          receipt_number: string | null
          receipt_url: string | null
          stall_id: string | null
          stall_location: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_payments_enriched"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_admin_stalls_list: {
        Args: { _search?: string; _status?: string }
        Returns: {
          business_name: string | null
          created_at: string | null
          id: string | null
          last_payment_date: string | null
          location: string | null
          monthly_rent: number | null
          notes: string | null
          outstanding_balance: number | null
          size: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_stalls_list"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_admin_update_stall_status: {
        Args: { _admin_id: string; _stall_id: string; _status: string }
        Returns: boolean
      }
      fn_admin_vendors_list: {
        Args: { _search?: string }
        Returns: {
          account_status: string | null
          address: string | null
          age: number | null
          avatar_url: string | null
          birthdate: string | null
          business_name: string | null
          contact_number: string | null
          created_at: string | null
          decline_reason: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          stall_id: string | null
          stall_number: string | null
          stall_status: string | null
          updated_at: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_active_vendors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_mark_all_notifications_read: {
        Args: { _user_id: string }
        Returns: number
      }
      fn_mark_notification_read: {
        Args: { _notification_id: string }
        Returns: boolean
      }
      fn_notify_all_vendors: {
        Args: { _message: string; _title: string; _type?: string }
        Returns: number
      }
      fn_notify_vendors: {
        Args: {
          _message: string
          _title: string
          _type?: string
          _vendor_ids: string[]
        }
        Returns: number
      }
      fn_payment_reports: {
        Args: { _month?: number; _year?: number }
        Returns: {
          collected: number
          occupancy_pct: number
          overdue: number
          pending: number
          period_label: string
          period_month: number
          period_year: number
          total_amount: number
          total_transactions: number
        }[]
      }
      fn_recent_announcements: {
        Args: { _limit?: number }
        Returns: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_recent_payments: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          id: string
          payment_date: string
          payment_method: string
          period_label: string
          receipt_number: string
          stall_number: string
          status: string
          vendor_email: string
          vendor_name: string
        }[]
      }
      fn_seed_admin_role: { Args: { _user_id: string }; Returns: undefined }
      fn_staff_mark_maintenance: {
        Args: { _staff_id: string; _stall_id: string }
        Returns: boolean
      }
      fn_staff_overview: {
        Args: never
        Returns: {
          active_stalls: number | null
          maintenance_stalls: number | null
          monthly_revenue: number | null
          todays_revenue: number | null
          todays_txn_count: number | null
          weekly_revenue: number | null
          yearly_revenue: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_staff_overview"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_staff_payment_records: {
        Args: { _period?: string; _search?: string; _status?: string }
        Returns: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          period_label: string | null
          period_month: number | null
          period_year: number | null
          receipt_number: string | null
          stall_number: string | null
          status: string | null
          vendor_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_staff_payment_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_staff_report_download: {
        Args: { _period?: string }
        Returns: {
          overdue_count: number
          paid_count: number
          pending_count: number
          period_label: string
          total_revenue: number
          total_transactions: number
        }[]
      }
      fn_staff_stalls_list: {
        Args: { _search?: string }
        Returns: {
          business_name: string | null
          created_at: string | null
          id: string | null
          last_payment_date: string | null
          location: string | null
          monthly_rent: number | null
          notes: string | null
          outstanding_balance: number | null
          size: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_stalls_list"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_user_valid_ids: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          storage_path: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_valid_ids"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_vendor_announcements: {
        Args: { _limit?: number }
        Returns: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_vendor_next_due: { Args: { _vendor_id: string }; Returns: string }
      fn_vendor_overview: {
        Args: { _vendor_id: string }
        Returns: {
          business_name: string | null
          email: string | null
          full_name: string | null
          location: string | null
          monthly_rent: number | null
          next_due_date: string | null
          size: string | null
          stall_id: string | null
          stall_number: string | null
          stall_status: string | null
          total_overdue: number | null
          total_paid: number | null
          total_pending: number | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_vendor_overview"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_vendor_payments: {
        Args: { _vendor_id: string }
        Returns: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          business_name: string | null
          created_at: string | null
          days_until_due: number | null
          due_date: string | null
          id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          period_label: string | null
          period_month: number | null
          period_year: number | null
          phone: string | null
          receipt_number: string | null
          receipt_url: string | null
          stall_id: string | null
          stall_location: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_payments_enriched"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_vendor_stall: {
        Args: { _vendor_id: string }
        Returns: {
          business_name: string | null
          created_at: string | null
          id: string | null
          last_payment_date: string | null
          location: string | null
          monthly_rent: number | null
          notes: string | null
          outstanding_balance: number | null
          size: string | null
          stall_number: string | null
          status: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_stalls_list"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_overdue_payments: { Args: never; Returns: number }
      reapprove_vendor_request: {
        Args: { _request_id: string }
        Returns: boolean
      }
      upload_valid_id: {
        Args: {
          _file_name: string
          _file_url: string
          _storage_path: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "declined"
      account_status_enum: "pending" | "active" | "suspended" | "declined"
      announcement_status: "normal" | "warning" | "urgent"
      app_role: "admin" | "staff" | "vendor" | "student"
      notification_type: "system" | "payment_due" | "overdue" | "warning"
      payment_method: "cash" | "gcash" | "maya" | "cliqq" | "bank_transfer"
      payment_status: "paid" | "pending" | "overdue"
      stall_status: "available" | "occupied" | "maintenance"
      vendor_request_status: "pending" | "approved" | "declined"
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
      account_status: ["pending", "active", "suspended", "declined"],
      account_status_enum: ["pending", "active", "suspended", "declined"],
      announcement_status: ["normal", "warning", "urgent"],
      app_role: ["admin", "staff", "vendor", "student"],
      notification_type: ["system", "payment_due", "overdue", "warning"],
      payment_method: ["cash", "gcash", "maya", "cliqq", "bank_transfer"],
      payment_status: ["paid", "pending", "overdue"],
      stall_status: ["available", "occupied", "maintenance"],
      vendor_request_status: ["pending", "approved", "declined"],
    },
  },
} as const
