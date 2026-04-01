import type { CompanyRow } from '@/types/integrations'
import { asRecord, pickString } from '@/lib/safe-data'

/** In-page tab keys for `/company?tab=` deep links. */
export type CompanyDetailTab = 'overview' | 'data' | 'financials' | 'market' | 'social' | 'reports' | 'activity'

const COMPANY_DETAIL_TAB_SET = new Set<string>([
  'overview',
  'data',
  'financials',
  'market',
  'social',
  'reports',
  'activity',
])

export function parseCompanyDetailTab(raw: string | null | undefined): CompanyDetailTab {
  if (raw && COMPANY_DETAIL_TAB_SET.has(raw)) return raw as CompanyDetailTab
  return 'overview'
}

export interface CompletenessSlice {
  key: string
  label: string
  done: boolean
  href: string
  tab: CompanyDetailTab
}

export function buildCompletenessSlices(
  company: CompanyRow | null | undefined,
  hasFinancials: boolean,
  hasMarket: boolean,
  hasSocial: boolean,
  integrationCount: number,
): CompletenessSlice[] {
  const c = company
  const hasCompany = Boolean(c)
  return [
    {
      key: 'profile',
      label: 'Company profile',
      done: Boolean(pickString(c?.name) && pickString(c?.industry)),
      href: hasCompany ? '/company?tab=data' : '/company/create',
      tab: 'data',
    },
    {
      key: 'financials',
      label: 'Financials',
      done: hasFinancials,
      href: hasCompany ? '/company?tab=financials' : '/financials',
      tab: 'financials',
    },
    {
      key: 'market',
      label: 'Market data',
      done: hasMarket,
      href: hasCompany ? '/company?tab=market' : '/market',
      tab: 'market',
    },
    {
      key: 'social',
      label: 'Social & brand',
      done: hasSocial,
      href: hasCompany ? '/company?tab=social' : '/social-brand',
      tab: 'social',
    },
    {
      key: 'integrations',
      label: 'At least one connector',
      done: integrationCount > 0,
      href: '/settings',
      tab: 'overview',
    },
  ]
}

export function completenessPercent(slices: CompletenessSlice[]): number {
  if (slices.length === 0) return 0
  const done = slices.filter((s) => s.done).length
  return Math.round((done / slices.length) * 100)
}

export function healthSubscores(healthScores: unknown): { label: string; value: number }[] {
  const r = asRecord(healthScores)
  const brandRaw = r.brand ?? r.social
  const entries: { label: string; raw: unknown }[] = [
    { label: 'Financial', raw: r.financial },
    { label: 'Market', raw: r.market },
    { label: 'Brand / social', raw: brandRaw },
    { label: 'Overall', raw: r.overall },
  ]
  return entries.map(({ label, raw }) => {
    const num = typeof raw === 'number' ? raw : Number(raw)
    return {
      label,
      value: Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0,
    }
  })
}
