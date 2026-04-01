import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { CompletenessSlice } from '@/lib/dashboard-utils'

export interface DataCompletenessBadgeProps {
  percent: number
  slices: CompletenessSlice[]
  className?: string
}

export function DataCompletenessBadge({ percent, slices, className }: DataCompletenessBadgeProps) {
  const safe = Math.min(100, Math.max(0, percent))
  const list = Array.isArray(slices) ? slices : []
  const pending = list.filter((s) => !s.done)

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Data completeness</h2>
          <p className="text-sm text-muted-foreground">Prioritized gaps — jump to the right tab.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold tabular-nums text-primary">{safe}%</span>
      </div>
      <Progress value={safe} className="mt-4" />
      <ul className="mt-4 space-y-2" role="list">
        {pending.length === 0 ? (
          <li className="flex items-center gap-2 text-sm text-[rgb(22,163,74)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            All guided slices satisfied — run analysis when ready.
          </li>
        ) : (
          pending.map((s) => (
            <li key={s.key}>
              <Link
                to={s.href}
                className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">Open to add data</span>
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </Card>
  )
}
