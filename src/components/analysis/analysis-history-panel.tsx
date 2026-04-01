import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnalysisHistoryList } from '@/components/analysis/analysis-history-list'
import { CacheSourceBadge } from '@/components/cache/cache-source-badge'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { invokePulseCacheApi } from '@/lib/pulse-cache-api'
import type { ReportRow } from '@/types/analysis'
import type { PulseCacheMeta } from '@/types/pulse-cache'
import { cn } from '@/lib/utils'

export interface AnalysisHistoryPanelProps {
  companyId: string
  reports: ReportRow[]
  pulseCache?: PulseCacheMeta | null
  isFetching?: boolean
  isStale?: boolean
  className?: string
  emptyMessage?: string
}

export function AnalysisHistoryPanel({
  companyId,
  reports,
  pulseCache,
  isFetching,
  isStale,
  className,
  emptyMessage,
}: AnalysisHistoryPanelProps) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const list = Array.isArray(reports) ? reports : []
  const loading = Boolean(isFetching || busy)

  const handleRefresh = async () => {
    setBusy(true)
    try {
      await invokePulseCacheApi({ op: 'get_company_analyses', companyId, bustCache: true })
      await queryClient.invalidateQueries({ queryKey: ['company-reports', companyId] })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Analysis history</h3>
          <p className="text-sm text-muted-foreground">Past runs with cache-busted refresh.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CacheStatusBadge meta={pulseCache} isFetching={loading} isStale={isStale} />
          <CacheSourceBadge meta={pulseCache} />
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] gap-2 text-sm transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
            disabled={loading}
            onClick={() => void handleRefresh()}
            aria-busy={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin motion-reduce:animate-none')} aria-hidden />
            Refresh list
          </Button>
        </div>
      </div>
      <AnalysisHistoryList reports={list} emptyMessage={emptyMessage} />
    </Card>
  )
}
