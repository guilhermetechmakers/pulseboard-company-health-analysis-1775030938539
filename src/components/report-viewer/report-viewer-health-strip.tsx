import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ParsedReportHealthScores } from '@/types/report-viewer'

export interface ReportViewerHealthStripProps {
  scores: ParsedReportHealthScores
  isLoading?: boolean
  className?: string
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{Math.round(value)}</p>
      <Progress value={value} className="mt-2 h-1.5" />
    </div>
  )
}

/**
 * Overall + pillar scores with linear meters (design tokens).
 */
export function ReportViewerHealthStrip({ scores, isLoading, className }: ReportViewerHealthStripProps) {
  if (isLoading) {
    return (
      <Card id="section-health" className={cn('scroll-mt-24 border-border/80 p-6 shadow-card', className)}>
        <div className="h-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      </Card>
    )
  }

  return (
    <Card
      id="section-health"
      className={cn(
        'scroll-mt-24 border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-card',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Health scoring</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Overall pulse</h2>
        </div>
        {scores.benchmarkUsed ? (
          <Badge variant="warning" className="shrink-0">
            Benchmarks on
          </Badge>
        ) : null}
      </div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Composite</p>
          <p className="text-5xl font-semibold tabular-nums tracking-tight text-primary">{Math.round(scores.overall)}</p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Blended view of financial, market, and brand signals for this report. Sub-scores feed the chart below.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ScoreCell label="Financial" value={scores.financial} />
        <ScoreCell label="Market" value={scores.market} />
        <ScoreCell label="Brand / social" value={scores.brandSocial} />
      </div>
    </Card>
  )
}
