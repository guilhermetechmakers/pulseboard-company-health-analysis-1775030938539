import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'

export interface AuditLogVolumeChartProps {
  series: { date: string; count: number }[]
  title?: string
}

export function AuditLogVolumeChart({ series, title = 'Audit events (7 days)' }: AuditLogVolumeChartProps) {
  const data = useMemo(() => {
    const s = Array.isArray(series) ? series : []
    return s.map((p) => ({
      date: typeof p?.date === 'string' ? p.date : '',
      count: typeof p?.count === 'number' && Number.isFinite(p.count) ? p.count : 0,
    }))
  }, [series])

  return (
    <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md">
      <h2 className="mb-1 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">UTC day buckets · all sources</p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis width={36} tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              name="Events"
              stroke="rgb(var(--primary))"
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
