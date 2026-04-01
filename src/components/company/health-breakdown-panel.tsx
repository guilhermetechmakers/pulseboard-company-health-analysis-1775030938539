import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import type { CompanyHealthScoreRow } from '@/types/health-score'

export interface HealthBreakdownPanelProps {
  overall: number | null
  financial: number
  market: number
  brandSocial: number
  history: CompanyHealthScoreRow[]
  className?: string
  /** When false, hides the panel title row (e.g. when wrapped by HealthScoreCard). */
  showHeader?: boolean
}

function sparkPoints(rows: CompanyHealthScoreRow[]): { label: string; score: number }[] {
  const list = Array.isArray(rows) ? [...rows] : []
  const chronological = list.reverse()
  return chronological.map((r) => {
    let label = ''
    try {
      label = format(parseISO(r.scored_at), 'MMM d')
    } catch {
      label = r.scored_at.slice(0, 10)
    }
    return { label, score: typeof r.overall === 'number' ? r.overall : 0 }
  })
}

function ScoreBar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{v}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted">
        <div className={cn('h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none', barClass)} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

export function HealthBreakdownPanel({
  overall,
  financial,
  market,
  brandSocial,
  history,
  className,
  showHeader = true,
}: HealthBreakdownPanelProps) {
  const spark = sparkPoints(history)

  return (
    <Card
      className={cn(
        'border-border/80 p-6 shadow-card transition-shadow duration-200 hover:shadow-lg',
        className,
      )}
    >
      {showHeader ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Health breakdown</h2>
            <p className="text-sm text-muted-foreground">Stacked sub-scores and overall trend from saved analyses.</p>
          </div>
          <Activity className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        </div>
      ) : null}

      <div className={cn('flex flex-wrap items-end gap-4 border-b border-border/60 pb-6', showHeader ? 'mb-6' : 'mb-4')}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall</p>
          <p className="text-4xl font-semibold text-primary tabular-nums" aria-live="polite">
            {overall != null ? overall : '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-border bg-muted/20 px-3 py-1.5">
            Financial <strong className="ml-1 text-foreground">{financial}</strong>
          </span>
          <span className="rounded-lg border border-border bg-muted/20 px-3 py-1.5">
            Market <strong className="ml-1 text-foreground">{market}</strong>
          </span>
          <span className="rounded-lg border border-border bg-muted/20 px-3 py-1.5">
            Brand <strong className="ml-1 text-foreground">{brandSocial}</strong>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Sub-score depth (0–100 each)</p>
          <ScoreBar label="Financial" value={financial} barClass="bg-primary" />
          <ScoreBar label="Market" value={market} barClass="bg-[rgb(22,163,74)]" />
          <ScoreBar label="Brand / social" value={brandSocial} barClass="bg-[rgb(245,158,11)]" />
        </div>
        <div className="h-[200px]">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Overall trend</p>
          {spark.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ left: 0, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="healthSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="rgb(var(--primary))"
                  strokeWidth={2}
                  fill="url(#healthSpark)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground motion-reduce:transition-none">
              Run a rule-based refresh or complete an analysis to see a trend line.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
