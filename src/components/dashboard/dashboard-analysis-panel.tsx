import { Link } from 'react-router-dom'
import { FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { cn } from '@/lib/utils'
import type { PulseCacheMeta } from '@/types/pulse-cache'

export interface DashboardAnalysisPanelProps {
  reportId: string | null
  status: string | null
  executiveSummary: string | null
  pulseCache?: PulseCacheMeta
  isFetching?: boolean
  isStale?: boolean
  className?: string
}

export function DashboardAnalysisPanel({
  reportId,
  status,
  executiveSummary,
  pulseCache,
  isFetching,
  isStale,
  className,
}: DashboardAnalysisPanelProps) {
  const excerpt =
    executiveSummary && executiveSummary.trim().length > 0
      ? executiveSummary.trim().slice(0, 420) + (executiveSummary.length > 420 ? '…' : '')
      : null

  return (
    <Card className={cn('border-border/80 p-6 transition-shadow duration-200 hover:shadow-md', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Latest analysis</h2>
        </div>
        <CacheStatusBadge meta={pulseCache} isFetching={isFetching} isStale={isStale} />
      </div>
      {reportId ? (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="text-sm font-medium capitalize text-foreground">{status ?? 'unknown'}</p>
          {excerpt ? (
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p className="text-sm leading-relaxed">{excerpt}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No executive summary yet. Open the full report or regenerate.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild variant="secondary" className="gap-2">
              <Link to={`/report/${reportId}`}>View report</Link>
            </Button>
            <Button
              asChild
              variant="primary"
              className="gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
            >
              <Link to="/generate">
                <Sparkles className="h-4 w-4" aria-hidden />
                Regenerate
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No reports yet. Generate an analysis when your data is ready.</p>
          <Button asChild variant="primary" className="gap-2">
            <Link to="/generate">
              <Sparkles className="h-4 w-4" aria-hidden />
              Run first analysis
            </Link>
          </Button>
        </div>
      )}
    </Card>
  )
}
