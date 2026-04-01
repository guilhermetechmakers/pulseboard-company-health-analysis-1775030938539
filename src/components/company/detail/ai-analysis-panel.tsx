import { Link } from 'react-router-dom'
import { Sparkles, AlertTriangle, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReportRow } from '@/types/analysis'

function linesFromUnknown(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim())
      continue
    }
    if (item !== null && typeof item === 'object' && 'text' in item) {
      const t = (item as { text?: unknown }).text
      if (typeof t === 'string' && t.trim()) out.push(t.trim())
    }
  }
  return out.slice(0, max)
}

export interface AIAnalysisPanelProps {
  report: ReportRow | null | undefined
  companyId: string
  className?: string
}

export function AIAnalysisPanel({ report, companyId, className }: AIAnalysisPanelProps) {
  const summary = (report?.executive_summary ?? '').trim()
  const risks = linesFromUnknown(report?.risks, 4)
  const opportunities = linesFromUnknown(report?.opportunities, 4)

  return (
    <Card className={cn('border-border/80 p-6 shadow-card transition-shadow duration-200 hover:shadow-md', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Latest analysis</h3>
          <p className="text-sm text-muted-foreground">
            {report?.status ? `Status: ${report.status}` : 'No completed run yet.'}
            {report?.analysis_depth ? ` · Depth: ${report.analysis_depth}` : ''}
          </p>
        </div>
        <Button asChild variant="primary" className="min-h-[44px] gap-2 transition-transform duration-200 hover:scale-[1.02]">
          <Link to="/generate">
            <Sparkles className="h-4 w-4" aria-hidden />
            Regenerate
          </Link>
        </Button>
      </div>
      {summary ? (
        <p className="mt-4 text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none">{summary.slice(0, 480)}{summary.length > 480 ? '…' : ''}</p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Run Generate analysis to populate executive summary, SWOT, and action items for company{' '}
          <span className="font-mono text-xs">{companyId.slice(0, 8)}…</span>
        </p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
            Risks
          </p>
          {risks.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground">
              {(risks ?? []).map((r, i) => (
                <li key={`r-${i}`}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No risk bullets in the latest payload.</p>
          )}
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
            Opportunities
          </p>
          {opportunities.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground">
              {(opportunities ?? []).map((o, i) => (
                <li key={`o-${i}`}>{o}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No opportunity bullets yet.</p>
          )}
        </div>
      </div>
      {report?.id ? (
        <div className="mt-4">
          <Button asChild variant="secondary" className="min-h-[44px]">
            <Link to={`/report/${report.id}`}>Open full report</Link>
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
