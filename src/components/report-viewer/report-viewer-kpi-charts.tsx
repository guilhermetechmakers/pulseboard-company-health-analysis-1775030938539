import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ParsedReportHealthScores } from '@/types/report-viewer'

export interface ReportViewerKpiChartsProps {
  scores: ParsedReportHealthScores
  className?: string
}

/**
 * Compact sub-score visualization for the report workspace (Recharts).
 */
export function ReportViewerKpiCharts({ scores, className }: ReportViewerKpiChartsProps) {
  const data = useMemo(
    () => [
      { name: 'Financial', value: scores.financial },
      { name: 'Market', value: scores.market },
      { name: 'Brand / social', value: scores.brandSocial },
    ],
    [scores.financial, scores.market, scores.brandSocial],
  )

  return (
    <Card className={className}>
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dimension scores</p>
        <p className="text-sm text-muted-foreground">Weighted view (0–100) for this analysis</p>
      </div>
      <div className="h-56 w-full p-4 motion-reduce:animate-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} width={32} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid rgb(var(--border))',
                background: 'rgb(var(--card))',
              }}
            />
            <Bar
              dataKey="value"
              fill="rgb(var(--primary))"
              radius={[6, 6, 0, 0]}
              name="Score"
              animationDuration={400}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
