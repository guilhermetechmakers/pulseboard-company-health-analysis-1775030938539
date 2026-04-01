import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AdminSparkline } from '@/components/admin/admin-sparkline'

export interface KpiCardProps {
  title: string
  value: ReactNode
  hint?: string
  trend?: number[]
  className?: string
}

export function KpiCard({ title, value, hint, trend, className }: KpiCardProps) {
  const series = Array.isArray(trend) ? trend : []
  return (
    <Card
      className={cn(
        'surface-card border-border/80 p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {series.length > 1 ? (
          <div className="w-24 shrink-0 pt-1" aria-hidden>
            <AdminSparkline values={series} />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
