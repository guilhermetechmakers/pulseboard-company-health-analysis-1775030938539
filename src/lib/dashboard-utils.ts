import type { CompanyRow } from '@/types/integrations'
import { asRecord, pickString } from '@/lib/safe-data'

export interface CompletenessSlice {
  key: string
  label: string
  done: boolean
  href: string
}

export function buildCompletenessSlices(
  company: CompanyRow | null | undefined,
  hasFinancials: boolean,
  hasMarket: boolean,
  hasSocial: boolean,
  integrationCount: number,
): CompletenessSlice[] {
  const c = company
  return [
    {
      key: 'profile',
      label: 'Company profile',
      done: Boolean(pickString(c?.name) && pickString(c?.industry)),
      href: '/company/create',
    },
    {
      key: 'financials',
      label: 'Financials',
      done: hasFinancials,
      href: '/financials',
    },
    {
      key: 'market',
      label: 'Market data',
      done: hasMarket,
      href: '/market',
    },
    {
      key: 'social',
      label: 'Social & brand',
      done: hasSocial,
      href: '/social-brand',
    },
    {
      key: 'integrations',
      label: 'At least one connector',
      done: integrationCount > 0,
      href: '/settings',
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
