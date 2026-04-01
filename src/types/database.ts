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
      integrations: {
        Row: {
          id: string
          company_id: string
          provider: string
          status: string
          scopes: string[]
          cadence: string
          last_synced_at: string | null
          next_sync_at: string | null
          credentials_ref: string | null
          settings: Record<string, unknown>
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          provider: string
          status?: string
          scopes?: string[]
          cadence?: string
          last_synced_at?: string | null
          next_sync_at?: string | null
          credentials_ref?: string | null
          settings?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>
      }
      oauth_credentials: {
        Row: {
          id: string
          integration_id: string
          provider: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          token_type: string | null
          scope: string | null
          account_id: string | null
          tenant_id: string | null
          encrypted_payload: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          provider: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          token_type?: string | null
          scope?: string | null
          account_id?: string | null
          tenant_id?: string | null
          encrypted_payload?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['oauth_credentials']['Insert']>
      }
      sync_jobs: {
        Row: {
          id: string
          company_id: string
          integration_id: string | null
          provider: string
          status: string
          started_at: string | null
          completed_at: string | null
          records_synced: number
          attempt_count: number
          error_message: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          integration_id?: string | null
          provider: string
          status?: string
          started_at?: string | null
          completed_at?: string | null
          records_synced?: number
          attempt_count?: number
          error_message?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sync_jobs']['Insert']>
      }
      data_snapshots: {
        Row: {
          id: string
          company_id: string
          provider: string
          snapshot_type: string
          payload: Record<string, unknown>
          captured_at: string
        }
        Insert: {
          id?: string
          company_id: string
          provider: string
          snapshot_type: string
          payload?: Record<string, unknown>
          captured_at?: string
        }
        Update: Partial<Database['public']['Tables']['data_snapshots']['Insert']>
      }
      financials: {
        Row: {
          id: string
          company_id: string
          revenue: number | null
          expenses: number | null
          profit: number | null
          assets: number | null
          liabilities: number | null
          cash: number | null
          debt: number | null
          metrics: Record<string, unknown>
          as_of_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          revenue?: number | null
          expenses?: number | null
          profit?: number | null
          assets?: number | null
          liabilities?: number | null
          cash?: number | null
          debt?: number | null
          metrics?: Record<string, unknown>
          as_of_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['financials']['Insert']>
      }
      analytics: {
        Row: {
          id: string
          company_id: string
          sessions: number | null
          users: number | null
          pageviews: number | null
          bounce_rate: number | null
          engagement_rate: number | null
          traffic_sources: Record<string, unknown>
          device_breakdown: Record<string, unknown>
          geo_breakdown: Record<string, unknown>
          captured_at: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          sessions?: number | null
          users?: number | null
          pageviews?: number | null
          bounce_rate?: number | null
          engagement_rate?: number | null
          traffic_sources?: Record<string, unknown>
          device_breakdown?: Record<string, unknown>
          geo_breakdown?: Record<string, unknown>
          captured_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['analytics']['Insert']>
      }
      social_data: {
        Row: {
          id: string
          company_id: string
          channel: string
          followers: number | null
          engagement_rate: number | null
          posts_count: number | null
          impressions: number | null
          clicks: number | null
          website_traffic: number | null
          brand_mentions: number | null
          captured_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          channel: string
          followers?: number | null
          engagement_rate?: number | null
          posts_count?: number | null
          impressions?: number | null
          clicks?: number | null
          website_traffic?: number | null
          brand_mentions?: number | null
          captured_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['social_data']['Insert']>
      }
      billing: {
        Row: {
          id: string
          company_id: string
          stripe_customer_id: string | null
          plan_name: string | null
          status: string
          monthly_recurring_revenue: number | null
          invoice_total: number | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          stripe_customer_id?: string | null
          plan_name?: string | null
          status?: string
          monthly_recurring_revenue?: number | null
          invoice_total?: number | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['billing']['Insert']>
      }
      csv_uploads: {
        Row: {
          id: string
          company_id: string
          file_name: string
          status: string
          rows_processed: number
          mapping: Record<string, unknown>
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          file_name: string
          status?: string
          rows_processed?: number
          mapping?: Record<string, unknown>
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['csv_uploads']['Insert']>
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
