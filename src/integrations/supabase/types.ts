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
      client_websites: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          deadline: string | null
          description: string | null
          domain: string | null
          id: string
          notes: string | null
          progress_percentage: number
          project_name: string
          start_date: string | null
          status: string
          supabase_project: string | null
          updated_at: string
          user_id: string
          vercel_project: string | null
          website_url: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          notes?: string | null
          progress_percentage?: number
          project_name: string
          start_date?: string | null
          status?: string
          supabase_project?: string | null
          updated_at?: string
          user_id?: string
          vercel_project?: string | null
          website_url?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          notes?: string | null
          progress_percentage?: number
          project_name?: string
          start_date?: string | null
          status?: string
          supabase_project?: string | null
          updated_at?: string
          user_id?: string
          vercel_project?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          access_status: string
          amount: number | null
          created_at: string
          email: string | null
          expiration_date: string | null
          id: string
          name: string
          notes: string | null
          payment_status: string
          phone: string | null
          product_id: string | null
          product_type: string | null
          purchase_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_status?: string
          amount?: number | null
          created_at?: string
          email?: string | null
          expiration_date?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          product_id?: string | null
          product_type?: string | null
          purchase_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_status?: string
          amount?: number | null
          created_at?: string
          email?: string | null
          expiration_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          product_id?: string | null
          product_type?: string | null
          purchase_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          google_drive_url: string | null
          id: string
          landing_page_url: string | null
          notes: string | null
          price: number
          product_name: string
          product_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          google_drive_url?: string | null
          id?: string
          landing_page_url?: string | null
          notes?: string | null
          price?: number
          product_name: string
          product_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          google_drive_url?: string | null
          id?: string
          landing_page_url?: string | null
          notes?: string | null
          price?: number
          product_name?: string
          product_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget: number | null
          created_at: string
          desired_city: string | null
          desired_property_type: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          desired_city?: string | null
          desired_property_type?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          desired_city?: string | null
          desired_property_type?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          commune: string | null
          created_at: string
          dataset_id: string | null
          description: string | null
          id: string
          images: string[]
          marketplace_url: string | null
          notes: string | null
          price: number | null
          property_type: string
          status: string
          surface: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          commune?: string | null
          created_at?: string
          dataset_id?: string | null
          description?: string | null
          id?: string
          images?: string[]
          marketplace_url?: string | null
          notes?: string | null
          price?: number | null
          property_type?: string
          status?: string
          surface?: number | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          commune?: string | null
          created_at?: string
          dataset_id?: string | null
          description?: string | null
          id?: string
          images?: string[]
          marketplace_url?: string | null
          notes?: string | null
          price?: number | null
          property_type?: string
          status?: string
          surface?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "property_dataset"
            referencedColumns: ["id"]
          },
        ]
      }
      property_dataset: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          commune: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          price: number | null
          property_type: string
          surface: number | null
          title: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          commune?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          price?: number | null
          property_type?: string
          surface?: number | null
          title: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          commune?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          price?: number | null
          property_type?: string
          surface?: number | null
          title?: string
        }
        Relationships: []
      }
      property_leads: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          property_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string
          client_website_id: string | null
          created_at: string
          description: string | null
          digital_product_id: string | null
          id: string
          name: string
          notes: string | null
          property_id: string | null
          saas_project_id: string | null
          tags: string[]
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string
          client_website_id?: string | null
          created_at?: string
          description?: string | null
          digital_product_id?: string | null
          id?: string
          name: string
          notes?: string | null
          property_id?: string | null
          saas_project_id?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Update: {
          category?: string
          client_website_id?: string | null
          created_at?: string
          description?: string | null
          digital_product_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          property_id?: string | null
          saas_project_id?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_client_website_id_fkey"
            columns: ["client_website_id"]
            isOneToOne: false
            referencedRelation: "client_websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_saas_project_id_fkey"
            columns: ["saas_project_id"]
            isOneToOne: false
            referencedRelation: "saas_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          notes: string | null
          production_url: string | null
          progress_percentage: number
          project_name: string
          repository_url: string | null
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          production_url?: string | null
          progress_percentage?: number
          project_name: string
          repository_url?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          production_url?: string | null
          progress_percentage?: number
          project_name?: string
          repository_url?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          notes: string | null
          payment_status: string
          product_id: string | null
          provider: string | null
          provider_reference: string | null
          purchase_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          purchase_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          purchase_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string | null
          client_website_id: string | null
          created_at: string
          description: string | null
          digital_product_id: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          property_id: string | null
          saas_project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          client_website_id?: string | null
          created_at?: string
          description?: string | null
          digital_product_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          property_id?: string | null
          saas_project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          client_website_id?: string | null
          created_at?: string
          description?: string | null
          digital_product_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          property_id?: string | null
          saas_project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_website_id_fkey"
            columns: ["client_website_id"]
            isOneToOne: false
            referencedRelation: "client_websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_saas_project_id_fkey"
            columns: ["saas_project_id"]
            isOneToOne: false
            referencedRelation: "saas_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
