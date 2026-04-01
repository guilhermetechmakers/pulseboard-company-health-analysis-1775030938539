export type ReportTextSectionKey =
  | 'executive_summary'
  | 'financial_analysis'
  | 'market_analysis'
  | 'social_analysis'

export type ReportViewerNavItem = {
  id: string
  label: string
  sectionKey?: ReportTextSectionKey | 'swot' | 'risks' | 'charts' | 'snapshots' | 'export'
}

export const REPORT_VIEWER_NAV: ReportViewerNavItem[] = [
  { id: 'section-health', label: 'Health & KPIs', sectionKey: 'charts' },
  { id: 'section-exec', label: 'Executive summary', sectionKey: 'executive_summary' },
  { id: 'section-swot', label: 'SWOT', sectionKey: 'swot' },
  { id: 'section-fin', label: 'Financial analysis', sectionKey: 'financial_analysis' },
  { id: 'section-mkt', label: 'Market analysis', sectionKey: 'market_analysis' },
  { id: 'section-soc', label: 'Social & brand', sectionKey: 'social_analysis' },
  { id: 'section-risks', label: 'Risks & actions', sectionKey: 'risks' },
  { id: 'section-snapshots', label: 'Snapshots', sectionKey: 'snapshots' },
  { id: 'section-export', label: 'Export & PDF', sectionKey: 'export' },
]

export type ParsedReportHealthScores = {
  overall: number
  financial: number
  market: number
  brandSocial: number
  benchmarkUsed: boolean
}

export function parseReportHealthScores(
  row: { overall?: number; financial?: number | null; market?: number | null; brand_social?: number | null; benchmarks?: unknown } | null,
  embedded: Record<string, unknown>,
): ParsedReportHealthScores {
  const n = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0
  const overallRow = row?.overall
  const finRow = row?.financial
  const mktRow = row?.market
  const brandRow = row?.brand_social
  const bench = row?.benchmarks
  const benchmarkUsed =
    bench !== null && typeof bench === 'object' && !Array.isArray(bench) && Object.keys(bench as object).length > 0

  const overall =
    n(overallRow) ||
    n(embedded.overall) ||
    n((embedded.breakdown as Record<string, unknown> | undefined)?.overall)
  const financial =
    n(finRow) ||
    n(embedded.financial) ||
    n((embedded.breakdown as Record<string, unknown> | undefined)?.financial)
  const market =
    n(mktRow) ||
    n(embedded.market) ||
    n((embedded.breakdown as Record<string, unknown> | undefined)?.market)
  const brandSocial =
    n(brandRow) ||
    n(embedded.brand_social ?? embedded.brandSocial) ||
    n((embedded.breakdown as Record<string, unknown> | undefined)?.brand_social)

  return {
    overall: overall || n(embedded.score),
    financial,
    market,
    brandSocial,
    benchmarkUsed,
  }
}
