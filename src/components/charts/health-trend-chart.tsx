import { useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card } from '@/components/ui/card'

interface Point {
  label: string
  score: number
}

const fallback: Point[] = [
  { label: 'Jan', score: 54 },
  { label: 'Feb', score: 61 },
  { label: 'Mar', score: 64 },
  { label: 'Apr', score: 69 },
]

export interface HealthTrendChartProps {
  /** Latest dimension snapshot (financial, market, brand, overall). */
  data?: Point[]
  /** Chronological overall scores from persisted health history (oldest → newest). */
  overallHistory?: Point[]
}

export function HealthTrendChart({ data, overallHistory }: HealthTrendChartProps) {
  const chartData = useMemo(() => {
    const hist = Array.isArray(overallHistory) ? overallHistory : []
    if (hist.length > 1) return hist
    const d = Array.isArray(data) && data.length > 0 ? data : fallback
    return d
  }, [data, overallHistory])

  const title =
    Array.isArray(overallHistory) && overallHistory.length > 1
      ? 'Overall health trend'
      : 'Health dimensions snapshot'

  return (
    <Card className="h-[300px] border-border/80 shadow-card transition-shadow duration-200 hover:shadow-md">
      <h3 className="mb-1 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        {Array.isArray(overallHistory) && overallHistory.length > 1
          ? 'From saved health score history on your company.'
          : 'Sub-score mix from the latest stored model (run analysis or refresh scores for history).'}
      </p>
      <ResponsiveContainer width="100%" height="78%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} width={36} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="score"
            stroke="rgb(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
