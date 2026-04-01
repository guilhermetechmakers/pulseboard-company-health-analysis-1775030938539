import { Link } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnalysisHistoryPanel } from '@/components/analysis/analysis-history-panel'
import type { ReportRow } from '@/types/analysis'
import type { PulseCacheMeta } from '@/types/pulse-cache'
import { cn } from '@/lib/utils'

export interface ReportsPanelProps {
  companyId: string
  reports: ReportRow[]
  pulseCache?: PulseCacheMeta | null
  isFetching?: boolean
  isStale?: boolean
  className?: string
}

export function ReportsPanel({ companyId, reports, pulseCache, isFetching, isStale, className }: ReportsPanelProps) {
  const list = Array.isArray(reports) ? reports : []

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight">Reports</h3>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="min-h-[44px] gap-2">
            <Link to="/data/export">
              <FileDown className="h-4 w-4" aria-hidden />
              Export CSV
            </Link>
          </Button>
          <Button asChild variant="primary" className="min-h-[44px]">
            <Link to="/generate">New analysis</Link>
          </Button>
        </div>
      </div>
      <AnalysisHistoryPanel
        companyId={companyId}
        reports={list}
        pulseCache={pulseCache}
        isFetching={isFetching}
        isStale={isStale}
      />
    </div>
  )
}
