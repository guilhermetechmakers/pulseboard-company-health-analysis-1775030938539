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
          website: string | null
          business_model: string | null
          target_customer: string | null
          target_customers: string | null
          goals: string | null
          products: string | null
          products_services: string[]
          onboarding_complete: boolean
          health_scores: Record<string, unknown>
          search_tags: string[]
          last_analysis_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          industry?: string | null
          stage?: string | null
          website?: string | null
          business_model?: string | null
          target_customer?: string | null
          target_customers?: string | null
          goals?: string | null
          products?: string | null
          products_services?: string[]
          onboarding_complete?: boolean
          health_scores?: Record<string, unknown>
          search_tags?: string[]
          last_analysis_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          industry?: string | null
          stage?: string | null
          website?: string | null
          business_model?: string | null
          target_customer?: string | null
          target_customers?: string | null
          goals?: string | null
          products?: string | null
          products_services?: string[]
          onboarding_complete?: boolean
          health_scores?: Record<string, unknown>
          search_tags?: string[]
          last_analysis_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_company_memberships: {
        Row: {
          id: string
          user_id: string
          company_id: string
          role: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          role?: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          role?: string
          is_primary?: boolean
        }
        Relationships: []
      }
      onboarding_drafts: {
        Row: {
          id: string
          user_id: string
          data: Record<string, unknown>
          step: number
          last_saved_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          data?: Record<string, unknown>
          step?: number
          last_saved_at?: string
          created_at?: string
        }
        Update: {
          data?: Record<string, unknown>
          step?: number
          last_saved_at?: string
        }
        Relationships: []
      }
      analysis_history: {
        Row: {
          id: string
          company_id: string
          run_at: string
          summary: string
          details: Record<string, unknown>
          report_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          run_at?: string
          summary?: string
          details?: Record<string, unknown>
          report_id?: string | null
          created_at?: string
        }
        Update: {
          summary?: string
          details?: Record<string, unknown>
          report_id?: string | null
        }
        Relationships: []
      }
      admin_consolidations: {
        Row: {
          id: string
          user_id: string
          source_company_id: string
          target_company_id: string
          status: string
          dry_run: boolean
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_company_id: string
          target_company_id: string
          status?: string
          dry_run?: boolean
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          status?: string
          metadata?: Record<string, unknown>
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          payload: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          payload?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          payload?: Record<string, unknown>
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          company_id: string
          initiated_by: string | null
          analysis_depth: string
          source_model: string | null
          benchmarking_enabled: boolean
          consent_recorded_at: string | null
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
          initiated_by?: string | null
          analysis_depth?: string
          source_model?: string | null
          benchmarking_enabled?: boolean
          consent_recorded_at?: string | null
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
        Relationships: []
      }
      report_snapshots: {
        Row: {
          id: string
          report_id: string
          created_by: string | null
          label: string
          notes: string | null
          sections: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          created_by?: string | null
          label?: string
          notes?: string | null
          sections?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['report_snapshots']['Insert']>
        Relationships: []
      }
      report_section_contents: {
        Row: {
          id: string
          report_id: string
          section_key: string
          content: string
          edited_at: string
          author_id: string | null
        }
        Insert: {
          id?: string
          report_id: string
          section_key: string
          content?: string
          edited_at?: string
          author_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['report_section_contents']['Insert']>
        Relationships: []
      }
      report_cache_entries: {
        Row: {
          id: string
          report_id: string
          cache_key: string
          value: Record<string, unknown>
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          report_id: string
          cache_key: string
          value?: Record<string, unknown>
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['report_cache_entries']['Insert']>
        Relationships: []
      }
      company_health_scores: {
        Row: {
          id: string
          company_id: string
          report_id: string | null
          scored_at: string
          overall: number
          financial: number | null
          market: number | null
          brand_social: number | null
          benchmarks: Record<string, unknown>
          notes: string | null
          source: string
        }
        Insert: {
          id?: string
          company_id: string
          report_id?: string | null
          scored_at?: string
          overall: number
          financial?: number | null
          market?: number | null
          brand_social?: number | null
          benchmarks?: Record<string, unknown>
          notes?: string | null
          source?: string
        }
        Update: Partial<Database['public']['Tables']['company_health_scores']['Insert']>
        Relationships: []
      }
      company_input_snapshots: {
        Row: {
          id: string
          company_id: string
          created_by: string | null
          label: string
          payload: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          created_by?: string | null
          label?: string
          payload?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_input_snapshots']['Insert']>
        Relationships: []
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
          settings: Record<string, unknown>
          last_error: string | null
          created_at: string
          updated_at: string
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
          settings?: Record<string, unknown>
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>
        Relationships: []
      }
      integration_credentials: {
        Row: {
          id: string
          company_id: string
          provider: string
          encrypted_payload: string
          integration_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          provider: string
          encrypted_payload: string
          integration_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['integration_credentials']['Insert']>
        Relationships: []
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
          error_message: string | null
          metadata: Record<string, unknown>
          created_at: string
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
          error_message?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sync_jobs']['Insert']>
        Relationships: []
      }
      data_snapshots: {
        Row: {
          id: string
          company_id: string
          provider: string
          snapshot_type: string
          payload: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          provider: string
          snapshot_type?: string
          payload?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['data_snapshots']['Insert']>
        Relationships: []
      }
      company_financials: {
        Row: {
          company_id: string
          revenue: number | null
          expenses: number | null
          profit: number | null
          assets: number | null
          liabilities: number | null
          cash: number | null
          debt: number | null
          per_month_metrics: unknown[]
          reconciliation_status: string | null
          source_provider: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          revenue?: number | null
          expenses?: number | null
          profit?: number | null
          assets?: number | null
          liabilities?: number | null
          cash?: number | null
          debt?: number | null
          per_month_metrics?: unknown[]
          reconciliation_status?: string | null
          source_provider?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_financials']['Insert']>
        Relationships: []
      }
      company_analytics: {
        Row: {
          company_id: string
          sessions: number | null
          users: number | null
          pageviews: number | null
          bounce_rate: number | null
          engagement_metrics: Record<string, unknown>
          traffic_sources: unknown[]
          device_breakdown: unknown[]
          geo_breakdown: unknown[]
          source_provider: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          sessions?: number | null
          users?: number | null
          pageviews?: number | null
          bounce_rate?: number | null
          engagement_metrics?: Record<string, unknown>
          traffic_sources?: unknown[]
          device_breakdown?: unknown[]
          geo_breakdown?: unknown[]
          source_provider?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_analytics']['Insert']>
        Relationships: []
      }
      company_social: {
        Row: {
          company_id: string
          followers: number | null
          engagement_rate: number | null
          posts_count: number | null
          impressions: number | null
          clicks: number | null
          website_traffic: number | null
          brand_mentions: unknown[]
          post_metrics: unknown[]
          source_provider: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          followers?: number | null
          engagement_rate?: number | null
          posts_count?: number | null
          impressions?: number | null
          clicks?: number | null
          website_traffic?: number | null
          brand_mentions?: unknown[]
          post_metrics?: unknown[]
          source_provider?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_social']['Insert']>
        Relationships: []
      }
      company_billing: {
        Row: {
          company_id: string
          subscriptions: unknown[]
          invoices: unknown[]
          payments: unknown[]
          customer_balance: number | null
          plan_metadata: Record<string, unknown>
          source_provider: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          subscriptions?: unknown[]
          invoices?: unknown[]
          payments?: unknown[]
          customer_balance?: number | null
          plan_metadata?: Record<string, unknown>
          source_provider?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_billing']['Insert']>
        Relationships: []
      }
      company_branding: {
        Row: {
          company_id: string
          logo_storage_path: string | null
          primary_color: string
          secondary_color: string
          font_family: string
          export_preferences: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          company_id: string
          logo_storage_path?: string | null
          primary_color?: string
          secondary_color?: string
          font_family?: string
          export_preferences?: Record<string, unknown>
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_branding']['Insert']>
        Relationships: []
      }
      company_market_data: {
        Row: {
          company_id: string
          competitors: unknown[]
          pricing_matrix: unknown[]
          trends: unknown[]
          opportunities: unknown[]
          threats: unknown[]
          updated_at: string
        }
        Insert: {
          company_id: string
          competitors?: unknown[]
          pricing_matrix?: unknown[]
          trends?: unknown[]
          opportunities?: unknown[]
          threats?: unknown[]
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_market_data']['Insert']>
        Relationships: []
      }
      csv_uploads: {
        Row: {
          id: string
          company_id: string
          file_name: string
          status: string
          rows_processed: number
          target_model: string | null
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
          target_model?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['csv_uploads']['Insert']>
        Relationships: []
      }
      company_imports: {
        Row: {
          id: string
          company_id: string
          user_id: string
          status: string
          rows_processed: number
          errors: unknown[]
          mapping: Record<string, unknown>
          file_name: string
          target_model: string | null
          progress: number
          error_message: string | null
          source_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          status?: string
          rows_processed?: number
          errors?: unknown[]
          mapping?: Record<string, unknown>
          file_name?: string
          target_model?: string | null
          progress?: number
          error_message?: string | null
          source_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_imports']['Insert']>
        Relationships: []
      }
      company_exports: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          scope: Record<string, unknown>
          format: string
          status: string
          progress: number
          fields_subset: string[]
          result_csv: string | null
          result_size: number | null
          schedule_cadence: string | null
          error_message: string | null
          generated_at: string | null
          downloaded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          scope?: Record<string, unknown>
          format?: string
          status?: string
          progress?: number
          fields_subset?: string[]
          result_csv?: string | null
          result_size?: number | null
          schedule_cadence?: string | null
          error_message?: string | null
          generated_at?: string | null
          downloaded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_exports']['Insert']>
        Relationships: []
      }
      import_mappings: {
        Row: {
          id: string
          user_id: string
          source_key: string
          target_field: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_key: string
          target_field: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['import_mappings']['Insert']>
        Relationships: []
      }
      import_audit: {
        Row: {
          id: string
          import_id: string
          action: string
          detail: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          import_id: string
          action: string
          detail?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['import_audit']['Insert']>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          metadata: Record<string, unknown>
          target: Record<string, unknown> | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          metadata?: Record<string, unknown>
          target?: Record<string, unknown> | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
        Relationships: []
      }
      asset_links: {
        Row: {
          id: string
          company_id: string
          type: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          type?: string
          url: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['asset_links']['Insert']>
        Relationships: []
      }
      export_jobs: {
        Row: {
          id: string
          company_id: string
          report_id: string
          initiated_by: string | null
          status: string
          progress: number
          export_params: Record<string, unknown>
          storage_path: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          report_id: string
          initiated_by?: string | null
          status?: string
          progress?: number
          export_params?: Record<string, unknown>
          storage_path?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['export_jobs']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          role: string
          account_status: string
          email: string | null
          last_login_at: string | null
          plan_tier: string
          signup_origin: string | null
          privacy_consent_at: string | null
          last_context_company_id: string | null
          single_company_mode: boolean
          failed_login_attempts: number
          locked_until: string | null
          avatar_url: string | null
          timezone: string | null
          language: string | null
          job_title: string | null
          preferred_communication_channel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          role?: string
          account_status?: string
          email?: string | null
          last_login_at?: string | null
          plan_tier?: string
          signup_origin?: string | null
          privacy_consent_at?: string | null
          last_context_company_id?: string | null
          single_company_mode?: boolean
          failed_login_attempts?: number
          locked_until?: string | null
          avatar_url?: string | null
          timezone?: string | null
          language?: string | null
          job_title?: string | null
          preferred_communication_channel?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      workspace_teams: {
        Row: {
          id: string
          owner_user_id: string
          company_id: string
          seats: number
          created_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          company_id: string
          seats?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace_teams']['Insert']>
        Relationships: []
      }
      workspace_team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: string
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace_team_members']['Insert']>
        Relationships: []
      }
      workspace_team_invites: {
        Row: {
          id: string
          team_id: string
          email: string
          role: string
          status: string
          invited_by: string
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          role?: string
          status?: string
          invited_by: string
          created_at?: string
          expires_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['workspace_team_invites']['Insert']>
        Relationships: []
      }
      billing_receipts: {
        Row: {
          id: string
          user_id: string
          label: string
          amount_cents: number | null
          currency: string
          issued_at: string
          external_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          amount_cents?: number | null
          currency?: string
          issued_at?: string
          external_url?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['billing_receipts']['Insert']>
        Relationships: []
      }
      admin_actions: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_user_id: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_user_id?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_actions']['Insert']>
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          next_billing_date: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string
          status?: string
          next_billing_date?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_activity_logs']['Insert']>
        Relationships: []
      }
      email_verification_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['email_verification_events']['Insert']>
        Relationships: []
      }
      password_reset_events: {
        Row: {
          id: string
          user_id: string | null
          email: string | null
          event_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email?: string | null
          event_type: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['password_reset_events']['Insert']>
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          user_id: string
          enabled: boolean
          factor_id: string | null
          recovery_codes_remaining: number
          updated_at: string
        }
        Insert: {
          user_id: string
          enabled?: boolean
          factor_id?: string | null
          recovery_codes_remaining?: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_mfa_settings']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          message: string
          data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          message: string
          data?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      notification_inbox_items: {
        Row: {
          id: string
          user_id: string
          notification_id: string
          read_at: string | null
          archived: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_id: string
          read_at?: string | null
          archived?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notification_inbox_items']['Insert']>
        Relationships: []
      }
      email_templates: {
        Row: {
          id: string
          type: string
          subject: string
          body_html: string
          body_text: string
          placeholders: unknown[]
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          subject: string
          body_html: string
          body_text: string
          placeholders?: unknown[]
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['email_templates']['Insert']>
        Relationships: []
      }
      email_dispatches: {
        Row: {
          id: string
          user_id: string
          resend_email_id: string | null
          template_type: string
          to_address: string
          subject: string
          status: string
          last_error: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resend_email_id?: string | null
          template_type: string
          to_address: string
          subject: string
          status?: string
          last_error?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['email_dispatches']['Insert']>
        Relationships: []
      }
      email_events: {
        Row: {
          id: string
          dispatch_id: string | null
          status: string
          event_at: string
          payload: Record<string, unknown>
        }
        Insert: {
          id?: string
          dispatch_id?: string | null
          status: string
          event_at?: string
          payload?: Record<string, unknown>
        }
        Update: Partial<Database['public']['Tables']['email_events']['Insert']>
        Relationships: []
      }
      notification_preferences: {
        Row: {
          user_id: string
          channels: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          user_id: string
          channels?: Record<string, unknown>
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
