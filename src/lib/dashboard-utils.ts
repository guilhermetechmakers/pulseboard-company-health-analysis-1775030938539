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
  const keys = ['financial', 'market', 'brand', 'overall'] as const
  return keys.map((k) => {
    const raw = r[k]
    const num = typeof raw === 'number' ? raw : Number(raw)
    const label =
      k === 'brand' ? 'Brand / social' : k === 'overall' ? 'Overall' : k.charAt(0).toUpperCase() + k.slice(1)
    return {
      label,
      value: Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0,
    }
  })
}
