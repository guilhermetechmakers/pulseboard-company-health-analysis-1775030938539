import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type CompletenessDot = 'ready' | 'partial' | 'missing'

export interface DataCompletenessChecklistItem {
  id: string
  label: string
  dot: CompletenessDot
  description?: string
}

export interface DataCompletenessChecklistProps {
  items: DataCompletenessChecklistItem[]
  percent: number
  className?: string
}

function Dot({ dot }: { dot: CompletenessDot }) {
  const color =
    dot === 'ready'
      ? 'bg-[rgb(22,163,74)]'
      : dot === 'partial'
        ? 'bg-[rgb(245,158,11)]'
        : 'bg-[rgb(220,38,38)]'
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', color)}
      aria-hidden
      title={dot === 'ready' ? 'Ready' : dot === 'partial' ? 'Partial' : 'Missing'}
    />
  )
}

export function DataCompletenessChecklist({ items, percent, className }: DataCompletenessChecklistProps) {
  const safeItems = Array.isArray(items) ? items : []
  return (
    <Card className={cn('border-border/80 p-4 shadow-card', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">Data readiness</h3>
          <p className="text-sm text-muted-foreground">Core slices required before you can start analysis.</p>
        </div>
        <p className="text-sm font-semibold text-primary" aria-live="polite">
          {percent}% overall
        </p>
      </div>
      <ul className="mt-4 space-y-2" aria-label="Data completeness checklist">
        {(safeItems ?? []).map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-border/80 bg-card px-3 py-2.5 transition-colors duration-200 hover:border-primary/25"
          >
            <Dot dot={item.dot} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              {item.description ? <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
