import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { AdminTrendPoint } from '@/types/admin'

export interface AdminTimeSeriesChartProps {
  companiesTrend: AdminTrendPoint[]
  reportsTrend: AdminTrendPoint[]
  title?: string
}

export function AdminTimeSeriesChart({
  companiesTrend,
  reportsTrend,
  title = 'New companies vs reports (14 days)',
}: AdminTimeSeriesChartProps) {
  const chartData = useMemo(() => {
    const c = Array.isArray(companiesTrend) ? companiesTrend : []
    const r = Array.isArray(reportsTrend) ? reportsTrend : []
    const byDate = new Map<string, { date: string; companies: number; reports: number }>()
    for (const p of c) {
      const d = typeof p?.date === 'string' ? p.date : ''
      if (!d) continue
      const cur = byDate.get(d) ?? { date: d, companies: 0, reports: 0 }
      cur.companies = typeof p.count === 'number' ? p.count : 0
      byDate.set(d, cur)
    }
    for (const p of r) {
      const d = typeof p?.date === 'string' ? p.date : ''
      if (!d) continue
      const cur = byDate.get(d) ?? { date: d, companies: 0, reports: 0 }
      cur.reports = typeof p.count === 'number' ? p.count : 0
      byDate.set(d, cur)
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [companiesTrend, reportsTrend])

  return (
    <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md">
      <h2 className="mb-1 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">UTC day buckets from live database counts.</p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis width={32} tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="companies"
              name="Companies"
              stroke="rgb(var(--primary))"
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="reports"
              name="Reports"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
