import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { CompletenessSlice } from '@/lib/dashboard-utils'

export interface DataCompletenessMeterProps {
  percent: number
  slices: CompletenessSlice[]
  className?: string
}

export function DataCompletenessMeter({ percent, slices, className }: DataCompletenessMeterProps) {
  const safe = Math.min(100, Math.max(0, percent))
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (safe / 100) * c

  return (
    <div
      className={cn(
        'surface-card flex flex-col gap-6 p-6 transition-shadow duration-200 hover:shadow-lg md:flex-row md:items-center',
        className,
      )}
    >
      <div className="relative mx-auto h-36 w-36 shrink-0 md:mx-0" aria-label={`Data completeness ${safe} percent`}>
        <svg className="-rotate-90" viewBox="0 0 120 120" width="144" height="144">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--muted))" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgb(var(--primary))"
            strokeWidth="10"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-foreground">{safe}%</span>
          <span className="text-xs text-muted-foreground">complete</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2" role="list">
        {(slices ?? []).map((s) => (
          <li key={s.key}>
            <Link
              to={s.href}
              className={cn(
                'flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm transition-all duration-200 hover:border-border hover:bg-muted/50 hover:scale-[1.01]',
                s.done && 'border-primary/20 bg-primary/5',
              )}
            >
              <span className="font-medium text-foreground">{s.label}</span>
              <span className={cn('text-xs font-medium', s.done ? 'text-[rgb(22,163,74)]' : 'text-muted-foreground')}>
                {s.done ? 'Done' : 'Add data'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
