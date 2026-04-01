export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          industry: string | null
          stage: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          industry?: string | null
          stage?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          industry?: string | null
          stage?: string | null
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          company_id: string
          status: string
          executive_summary: string | null
          swot: Record<string, unknown>
          financial_analysis: string | null
          market_analysis: string | null
          social_analysis: string | null
          risks: unknown[]
          opportunities: unknown[]
          action_plan: unknown[]
          health_scores: Record<string, unknown>
          payload: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          status?: string
          executive_summary?: string | null
          swot?: Record<string, unknown>
          financial_analysis?: string | null
          market_analysis?: string | null
          social_analysis?: string | null
          risks?: unknown[]
          opportunities?: unknown[]
          action_plan?: unknown[]
          health_scores?: Record<string, unknown>
          payload?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
      integration_credentials: {
        Row: {
          id: string
          company_id: string
          provider: string
          encrypted_payload: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          provider: string
          encrypted_payload: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['integration_credentials']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
  }
}
