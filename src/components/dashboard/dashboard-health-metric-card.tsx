import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface DashboardHealthMetricCardProps {
  title: string
  score: number
  recommendation: string
  /** Monotonic points for sparkline (y = score 0–100) */
  series: { x: number; y: number }[]
  className?: string
}

export function DashboardHealthMetricCard({ title, score, recommendation, series, className }: DashboardHealthMetricCardProps) {
  const data = (series ?? []).map((p) => ({ x: p.x, y: p.y }))
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 border-border/80 p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:translate-y-0 motion-reduce:transition-none',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{safeScore}</p>
        </div>
      </div>
      <div className="h-14 w-full" aria-hidden={data.length === 0}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <YAxis domain={[0, 100]} hide />
              <Area
                type="monotone"
                dataKey="y"
                stroke="rgb(11, 106, 247)"
                fill="rgba(11, 106, 247, 0.12)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center text-xs text-muted-foreground">No history yet</div>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{recommendation}</p>
    </Card>
  )
}
