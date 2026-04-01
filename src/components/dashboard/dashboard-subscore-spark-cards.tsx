import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DashboardHealthSparkPoint } from '@/types/dashboard'

export interface DashboardSubscoreSparkCardsProps {
  sparkline: DashboardHealthSparkPoint[]
  className?: string
}

type MetricKey = 'financial' | 'market' | 'brand_social'

const METRICS: { key: MetricKey; label: string; nextAction: string }[] = [
  { key: 'financial', label: 'Financial', nextAction: 'Add revenue, profit, and cash in Financials.' },
  { key: 'market', label: 'Market', nextAction: 'Capture competitors and trends in Market data.' },
  { key: 'brand_social', label: 'Brand / social', nextAction: 'Connect channels or enter social metrics.' },
]

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
}

function seriesFor(points: DashboardHealthSparkPoint[], key: MetricKey) {
  const rows = Array.isArray(points) ? points : []
  return rows.map((p, i) => ({
    i,
    v: num(p[key]),
  }))
}

export function DashboardSubscoreSparkCards({ sparkline, className }: DashboardSubscoreSparkCardsProps) {
  const points = Array.isArray(sparkline) ? sparkline : []

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {METRICS.map((m) => {
        const data = seriesFor(points, m.key)
        const latest = data.length > 0 ? data[data.length - 1]?.v ?? 0 : 0
        return (
          <Card
            key={m.key}
            className="border-border/80 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md motion-reduce:transition-none"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{latest}</p>
              </div>
            </div>
            <div className="mt-2 h-[52px] w-full" aria-hidden>
              {data.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(11, 106, 247)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="rgb(11, 106, 247)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      cursor={{ stroke: 'rgba(11, 106, 247, 0.25)' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value}`, 'Score']}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="rgb(11, 106, 247)"
                      strokeWidth={2}
                      fill={`url(#fill-${m.key})`}
                      isAnimationActive={typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center text-xs text-muted-foreground">Run analyses to build trends.</div>
              )}
            </div>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{m.nextAction}</p>
          </Card>
        )
      })}
    </div>
  )
}
