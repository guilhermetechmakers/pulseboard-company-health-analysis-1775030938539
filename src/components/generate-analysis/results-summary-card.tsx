import { Link } from 'react-router-dom'
import { AlertTriangle, Lightbulb, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportViewerLink } from '@/components/generate-analysis/report-viewer-link'
import { cn } from '@/lib/utils'
import type { AnalysisStatusResults } from '@/types/analysis-job'

export interface ResultsSummaryCardProps {
  reportId: string | null | undefined
  results: AnalysisStatusResults | undefined | null
  className?: string
}

function asText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

export function ResultsSummaryCard({ reportId, results, className }: ResultsSummaryCardProps) {
  const summary = (results?.executiveSummary ?? '').trim()
  const risks = Array.isArray(results?.risks) ? results.risks.filter((x): x is string => typeof x === 'string') : []
  const opportunities = Array.isArray(results?.opportunities)
    ? results.opportunities.filter((x): x is string => typeof x === 'string')
    : []
  const financial = results ? asText(results.financial) : null
  const market = results ? asText(results.market) : null
  const social = results ? asText(results.social) : null
  const topRisks = risks.slice(0, 4)
  const topOpps = opportunities.slice(0, 4)

  return (
    <Card className={cn('space-y-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            Results summary
          </h3>
          <p className="text-sm text-muted-foreground">Executive snapshot — open the report viewer to edit and export.</p>
        </div>
        {reportId ? <ReportViewerLink reportId={reportId} /> : null}
      </div>

      <div className="rounded-lg border border-border/70 bg-card/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive summary</p>
        {summary ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none">
            {summary}
            {summary.length >= 556 ? '…' : ''}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Summary will appear here when the job finishes.</p>
        )}
      </div>

      {financial || market || social ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key findings</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {financial ? <li>{financial.length > 180 ? `${financial.slice(0, 180)}…` : financial}</li> : null}
            {market ? <li>{market.length > 180 ? `${market.slice(0, 180)}…` : market}</li> : null}
            {social ? <li>{social.length > 180 ? `${social.slice(0, 180)}…` : social}</li> : null}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/15 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
            Top risks
          </p>
          {topRisks.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {(topRisks ?? []).map((r, i) => (
                <li key={`rs-${i}`}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No risk lines in the preview payload.</p>
          )}
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/15 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
            Top opportunities
          </p>
          {topOpps.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {(topOpps ?? []).map((o, i) => (
                <li key={`os-${i}`}>{o}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No opportunity lines in the preview payload.</p>
          )}
        </div>
      </div>

      {reportId ? (
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button asChild variant="secondary" className="min-h-[44px]">
            <Link to={`/report/${reportId}`}>View in report viewer</Link>
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
