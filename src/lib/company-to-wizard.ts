import type { Database } from '@/types/database'
import type { OnboardingWizardData } from '@/types/company-wizard'
import { asArray } from '@/lib/safe-data'

type CompanyRow = Database['public']['Tables']['companies']['Row']
type FinancialsRow = Database['public']['Tables']['company_financials']['Row']
type MarketRow = Database['public']['Tables']['company_market_data']['Row']
type SocialRow = Database['public']['Tables']['company_social']['Row']

function str(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return ''
  return String(n)
}

function competitorNames(raw: unknown): { name: string }[] {
  const arr = asArray(raw)
  const out: { name: string }[] = []
  for (const item of arr) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ name: item.trim() })
      continue
    }
    if (item !== null && typeof item === 'object' && 'name' in item) {
      const n = (item as { name?: unknown }).name
      if (typeof n === 'string' && n.trim()) out.push({ name: n.trim() })
    }
  }
  return out
}

function trendStrings(raw: unknown): string[] {
  const arr = asArray(raw)
  return arr.map((t) => (typeof t === 'string' ? t : String(t))).filter(Boolean)
}

function pricingNoteFromMatrix(raw: unknown): string {
  const arr = asArray(raw)
  const first = arr[0]
  if (first !== null && typeof first === 'object' && 'note' in first) {
    const n = (first as { note?: unknown }).note
    return typeof n === 'string' ? n : ''
  }
  return ''
}

function segmentFromOpportunities(raw: unknown): string {
  const arr = asArray(raw)
  const first = arr[0]
  if (first !== null && typeof first === 'object' && 'label' in first) {
    const l = (first as { label?: unknown }).label
    return typeof l === 'string' ? l : ''
  }
  return ''
}

function channelsFromSocial(social: SocialRow | null): OnboardingWizardData['step5']['channels'] {
  if (!social) return []
  const pm = asArray(social.post_metrics)
  if (pm.length > 0) {
    return pm.map((row) => {
      if (row !== null && typeof row === 'object') {
        const r = row as Record<string, unknown>
        const platform = typeof r.platform === 'string' ? r.platform : ''
        const followers = r.followers != null ? String(r.followers) : ''
        const engagement = r.engagement != null ? String(r.engagement) : ''
        return { platform, followers, engagement }
      }
      return { platform: '', followers: '', engagement: '' }
    })
  }
  return [
    {
      platform: '',
      followers: social.followers != null ? String(social.followers) : '',
      engagement: social.engagement_rate != null ? String(social.engagement_rate) : '',
    },
  ]
}

/**
 * Maps the user's single company + aggregates into wizard shape for edit mode.
 */
export function buildWizardDataFromCompany(
  company: CompanyRow,
  financials: FinancialsRow | null,
  market: MarketRow | null,
  social: SocialRow | null,
): OnboardingWizardData {
  const products =
    Array.isArray(company.products_services) && company.products_services.length > 0
      ? company.products_services.map((p) => (typeof p === 'string' ? p : String(p))).filter(Boolean)
      : company.products?.trim()
        ? [company.products.trim()]
        : []

  const competitors = market ? competitorNames(market.competitors) : []
  const trends = market ? trendStrings(market.trends) : []

  return {
    step1: {
      name: company.name ?? '',
      website: company.website ?? '',
    },
    step2: {
      industry: company.industry ?? '',
      business_model: company.business_model ?? '',
      products_services: products.length > 0 ? products : [''],
      target_customers: company.target_customers ?? company.target_customer ?? '',
    },
    step3: {
      revenue: financials?.revenue != null ? str(financials.revenue) : '',
      expenses: financials?.expenses != null ? str(financials.expenses) : '',
      profit_margin_pct: financials?.profit != null ? str(financials.profit) : '',
      cash: financials?.cash != null ? str(financials.cash) : '',
      debt: financials?.debt != null ? str(financials.debt) : '',
      cac: '',
      ltv: '',
    },
    step4: {
      competitors,
      pricing_note: market ? pricingNoteFromMatrix(market.pricing_matrix) : '',
      trends,
      market_segments: market ? segmentFromOpportunities(market.opportunities) : '',
    },
    step5: (() => {
      const ch = channelsFromSocial(social)
      return {
        channels: ch.length > 0 ? ch : [],
        website_traffic: social?.website_traffic != null ? str(social.website_traffic) : '',
        posting_frequency: social?.posts_count != null ? str(social.posts_count) : '',
      }
    })(),
  }
}
