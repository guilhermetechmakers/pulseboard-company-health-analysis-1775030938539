/**
 * Maps normalized connector payloads into PulseBoard domain tables.
 * Used by integration-sync Edge Function. All list fields are array-safe.
 */
import { asArray, asRecord, pickNumber } from './safe-json.ts'

export interface Ga4Normalized {
  sessions: number | null
  users: number | null
  pageviews: number | null
  bounceRate: number | null
  engagementMetrics: Record<string, unknown>
  trafficSources: unknown[]
  deviceBreakdown: unknown[]
  geoBreakdown: unknown[]
}

export function transformGa4Report(raw: unknown): Ga4Normalized {
  const root = asRecord(raw)
  const rows = asArray<unknown>(root.rows)
  const first = rows.length > 0 ? asRecord(rows[0]) : {}
  return {
    sessions: pickNumber(first.sessions),
    users: pickNumber(first.users),
    pageviews: pickNumber(first.screenPageViews ?? first.pageviews),
    bounceRate: pickNumber(first.bounceRate),
    engagementMetrics: asRecord(first.engagement),
    trafficSources: asArray(first.trafficSources),
    deviceBreakdown: asArray(first.deviceBreakdown),
    geoBreakdown: asArray(first.geoBreakdown),
  }
}

export interface QuickBooksFinancialSnapshot {
  revenue: number | null
  expenses: number | null
  profit: number | null
  assets: number | null
  liabilities: number | null
  cash: number | null
  debt: number | null
  perMonthMetrics: unknown[]
  reconciliationStatus: string | null
}

export function transformQuickBooksSummary(raw: unknown): QuickBooksFinancialSnapshot {
  const r = asRecord(raw)
  const rows = asArray<unknown>(r.monthly)
  return {
    revenue: pickNumber(r.revenue),
    expenses: pickNumber(r.expenses),
    profit: pickNumber(r.profit),
    assets: pickNumber(r.assets),
    liabilities: pickNumber(r.liabilities),
    cash: pickNumber(r.cash),
    debt: pickNumber(r.debt),
    perMonthMetrics: rows,
    reconciliationStatus: typeof r.reconciliationStatus === 'string' ? r.reconciliationStatus : null,
  }
}

export interface LinkedInSocialSnapshot {
  followers: number | null
  engagementRate: number | null
  postsCount: number | null
  impressions: number | null
  clicks: number | null
  postMetrics: unknown[]
}

export function transformLinkedInOrgMetrics(raw: unknown): LinkedInSocialSnapshot {
  const r = asRecord(raw)
  return {
    followers: pickNumber(r.followerCount ?? r.followers),
    engagementRate: pickNumber(r.engagementRate),
    postsCount: pickNumber(r.postsCount),
    impressions: pickNumber(r.impressions),
    clicks: pickNumber(r.clicks),
    postMetrics: asArray(r.posts ?? r.elements),
  }
}

export interface StripeBillingSnapshot {
  subscriptions: unknown[]
  invoices: unknown[]
  payments: unknown[]
  customerBalance: number | null
  planMetadata: Record<string, unknown>
}

export function transformStripeBilling(raw: unknown): StripeBillingSnapshot {
  const r = asRecord(raw)
  return {
    subscriptions: asArray(r.subscriptions ?? r.data),
    invoices: asArray(r.invoices),
    payments: asArray(r.payments),
    customerBalance: pickNumber(r.customerBalance),
    planMetadata: asRecord(r.planMetadata),
  }
}
