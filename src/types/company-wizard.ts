import type { Database } from '@/types/database'

export type OnboardingDraftRow = Database['public']['Tables']['onboarding_drafts']['Row']
export type AnalysisHistoryRow = Database['public']['Tables']['analysis_history']['Row']

export interface OnboardingWizardData {
  step1: {
    name: string
    website: string
  }
  step2: {
    industry: string
    business_model: string
    products_services: string[]
    target_customers: string
  }
  step3: {
    revenue: string
    expenses: string
    profit_margin_pct: string
    cash: string
    debt: string
    cac: string
    ltv: string
  }
  step4: {
    competitors: { name: string }[]
    pricing_note: string
    trends: string[]
    market_segments: string
  }
  step5: {
    channels: { platform: string; followers: string; engagement: string }[]
    website_traffic: string
    posting_frequency: string
  }
}

export const EMPTY_WIZARD_DATA: OnboardingWizardData = {
  step1: { name: '', website: '' },
  step2: { industry: '', business_model: '', products_services: [], target_customers: '' },
  step3: { revenue: '', expenses: '', profit_margin_pct: '', cash: '', debt: '', cac: '', ltv: '' },
  step4: { competitors: [], pricing_note: '', trends: [], market_segments: '' },
  step5: { channels: [], website_traffic: '', posting_frequency: '' },
}

export interface CompanyApiErrorBody {
  error?: string
  code?: string
  remediation?: string
  existingCompanyId?: string
}

export interface MultiCompanyUserPreview {
  userId: string
  companyCount: number
  companyIds: string[]
}
