import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { ChevronRight, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CompanyHealthScoreRow } from '@/types/health-score'

export interface AnalysisHistoryTimelineProps {
  entries: CompanyHealthScoreRow[]
  className?: string
  onSelect?: (entry: CompanyHealthScoreRow) => void
  selectedId?: string | null
}

function subLine(e: CompanyHealthScoreRow): string {
  const f = e.financial != null ? `F ${e.financial}` : 'F —'
  const m = e.market != null ? `M ${e.market}` : 'M —'
  const b = e.brand_social != null ? `B ${e.brand_social}` : 'B —'
  return `${f} · ${m} · ${b}`
}

export function AnalysisHistoryTimeline({
  entries,
  className,
  onSelect,
  selectedId,
}: AnalysisHistoryTimelineProps) {
  const list = Array.isArray(entries) ? entries : []

  if (list.length === 0) {
    return (
      <Card className={cn('border-dashed p-8 text-center text-sm text-muted-foreground', className)}>
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
        No saved health scores yet. Refresh with rules or run a full AI analysis.
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden border-border/80 p-0 shadow-card', className)}>
      <div className="border-b border-border/80 px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Analysis history</h2>
        <p className="text-sm text-muted-foreground">Each row is a persisted health score snapshot (LLM or rules).</p>
      </div>
      <ul className="divide-y divide-border/60" role="list" aria-label="Health score history">
        {list.map((e) => {
          let dateLabel = e.scored_at
          try {
            dateLabel = format(parseISO(e.scored_at), 'MMM d, yyyy · h:mm a')
          } catch {
            /* keep raw */
          }
          const isSelected = selectedId === e.id
          return (
            <li key={e.id}>
              <div
                className={cn(
                  'flex flex-col gap-3 px-6 py-4 transition-colors motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between',
                  isSelected ? 'bg-primary/5' : 'hover:bg-muted/40',
                )}
              >
                <button
                  type="button"
                  className="min-h-[44px] flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => onSelect?.(e)}
                  aria-pressed={isSelected}
                  aria-label={`Health score ${e.overall} on ${dateLabel}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-primary">{e.overall}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {e.source}
                    </Badge>
                  </div>
                  <time className="mt-1 block text-sm text-muted-foreground" dateTime={e.scored_at}>
                    {dateLabel}
                  </time>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{subLine(e)}</p>
                </button>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {e.report_id ? (
                    <Button asChild variant="secondary" className="gap-1 px-3 py-2 text-sm">
                      <Link to={`/report/${e.report_id}`}>
                        Report
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
