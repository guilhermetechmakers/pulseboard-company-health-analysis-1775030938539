import type { DashboardHealthSparkPoint } from '@/types/dashboard'
import { DashboardHealthMetricCard } from '@/components/dashboard/dashboard-health-metric-card'

const REC = {
  financial: 'Tighten revenue, expense, and cash inputs so the financial pillar reflects runway and profitability.',
  market: 'Enrich competitors and market trends to improve SWOT and market risk detection.',
  brand: 'Connect social or analytics channels to strengthen brand and engagement scoring.',
} as const

function seriesFor(rows: DashboardHealthSparkPoint[], pick: (r: DashboardHealthSparkPoint) => number | null | undefined) {
  const list = Array.isArray(rows) ? rows : []
  return list.map((r, idx) => {
    const raw = pick(r)
    const y = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0
    return { x: idx, y }
  })
}

function latestPick(rows: DashboardHealthSparkPoint[], pick: (r: DashboardHealthSparkPoint) => number | null | undefined): number {
  const list = Array.isArray(rows) ? [...rows] : []
  for (let i = list.length - 1; i >= 0; i--) {
    const raw = pick(list[i])
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.min(100, Math.max(0, raw))
  }
  return 0
}

export interface DashboardHealthBreakdownGridProps {
  healthSparkline: DashboardHealthSparkPoint[]
  /** Fallback scores when sparkline is empty (e.g. from company.health_scores JSON) */
  fallbackFinancial: number
  fallbackMarket: number
  fallbackBrand: number
}

export function DashboardHealthBreakdownGrid({
  healthSparkline,
  fallbackFinancial,
  fallbackMarket,
  fallbackBrand,
}: DashboardHealthBreakdownGridProps) {
  const rows = Array.isArray(healthSparkline) ? healthSparkline : []
  const finSeries = seriesFor(rows, (r) => r.financial)
  const mktSeries = seriesFor(rows, (r) => r.market)
  const brandSeries = seriesFor(rows, (r) => r.brand_social)

  const finScore = rows.length ? latestPick(rows, (r) => r.financial) : fallbackFinancial
  const mktScore = rows.length ? latestPick(rows, (r) => r.market) : fallbackMarket
  const brandScore = rows.length ? latestPick(rows, (r) => r.brand_social) : fallbackBrand

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardHealthMetricCard title="Financial" score={finScore} recommendation={REC.financial} series={finSeries} />
      <DashboardHealthMetricCard title="Market" score={mktScore} recommendation={REC.market} series={mktSeries} />
      <DashboardHealthMetricCard
        title="Brand / social"
        score={brandScore}
        recommendation={REC.brand}
        series={brandSeries}
        className="sm:col-span-2 lg:col-span-1"
      />
    </div>
  )
}
