import type { OnboardingWizardData } from '@/types/company-wizard'
import { EMPTY_WIZARD_DATA } from '@/types/company-wizard'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function competitors(v: unknown): { name: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!isRecord(item)) return { name: '' }
      return { name: str(item.name) }
    })
    .filter((c) => c.name.trim().length > 0)
}

function channels(v: unknown): { platform: string; followers: string; engagement: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!isRecord(item)) return { platform: '', followers: '', engagement: '' }
      return {
        platform: str(item.platform),
        followers: str(item.followers),
        engagement: str(item.engagement),
      }
    })
    .filter((c) => c.platform.trim().length > 0)
}

export function parseWizardDataFromUnknown(raw: unknown): OnboardingWizardData {
  if (!isRecord(raw)) return { ...EMPTY_WIZARD_DATA }

  const s1 = isRecord(raw.step1) ? raw.step1 : {}
  const s2 = isRecord(raw.step2) ? raw.step2 : {}
  const s3 = isRecord(raw.step3) ? raw.step3 : {}
  const s4 = isRecord(raw.step4) ? raw.step4 : {}
  const s5 = isRecord(raw.step5) ? raw.step5 : {}

  return {
    step1: {
      name: str(s1.name),
      website: str(s1.website),
    },
    step2: {
      industry: str(s2.industry),
      business_model: str(s2.business_model),
      products_services: strArr(s2.products_services),
      target_customers: str(s2.target_customers),
    },
    step3: {
      revenue: str(s3.revenue),
      expenses: str(s3.expenses),
      profit_margin_pct: str(s3.profit_margin_pct),
      cash: str(s3.cash),
      debt: str(s3.debt),
      cac: str(s3.cac),
      ltv: str(s3.ltv),
    },
    step4: {
      competitors: competitors(s4.competitors),
      pricing_note: str(s4.pricing_note),
      trends: strArr(s4.trends),
      market_segments: str(s4.market_segments),
    },
    step5: {
      channels: channels(s5.channels),
      website_traffic: str(s5.website_traffic),
      posting_frequency: str(s5.posting_frequency),
    },
  }
}
