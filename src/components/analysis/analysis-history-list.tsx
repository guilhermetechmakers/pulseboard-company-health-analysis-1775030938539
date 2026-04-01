import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ReportRow } from '@/types/analysis'

interface AnalysisHistoryListProps {
  reports: ReportRow[]
  emptyMessage?: string
}

export function AnalysisHistoryList({ reports, emptyMessage }: AnalysisHistoryListProps) {
  const list = Array.isArray(reports) ? reports : []

  if (list.length === 0) {
    return (
      <Card className="border-dashed p-6 text-sm text-muted-foreground">
        {emptyMessage ?? 'No analyses yet. Run one from Generate Analysis.'}
      </Card>
    )
  }

  return (
    <ul className="space-y-3">
      {(list ?? []).map((r) => (
        <li key={r.id}>
          <Card className="flex flex-col gap-3 p-4 transition-all duration-200 hover:shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium text-foreground">
                  {r.analysis_depth ?? 'standard'} analysis · {r.status}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                {r.source_model ? (
                  <p className="text-xs text-muted-foreground">Model: {r.source_model}</p>
                ) : null}
              </div>
            </div>
            <Link to={`/report/${r.id}`} className="inline-flex">
              <Button variant="secondary" type="button">
                Open report
              </Button>
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  )
}
