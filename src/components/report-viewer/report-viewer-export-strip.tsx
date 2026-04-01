import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDown, Loader2, Settings2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExportJobsForReport, useRefreshExportDownloadUrl } from '@/hooks/use-export-jobs'
import type { ExportJobRow } from '@/types/export'
import { cn } from '@/lib/utils'

export interface ReportViewerExportStripProps {
  reportId: string
  className?: string
}

function pickLatestCompleted(jobs: ExportJobRow[]): ExportJobRow | null {
  const list = Array.isArray(jobs) ? jobs : []
  const done = list.filter((j) => j.status === 'completed')
  return done.length > 0 ? done[0] : null
}

/**
 * Quick export affordances: PDF settings link, latest completed job, refresh signed URL.
 */
export function ReportViewerExportStrip({ reportId, className }: ReportViewerExportStripProps) {
  const { data: jobs = [], isLoading } = useExportJobsForReport(reportId)
  const refreshUrl = useRefreshExportDownloadUrl()
  const [localUrl, setLocalUrl] = useState<string | null>(null)

  const latest = useMemo(() => pickLatestCompleted(jobs as ExportJobRow[]), [jobs])

  return (
    <Card
      id="section-export"
      className={cn('scroll-mt-24 space-y-4 border-border/80 p-5 shadow-card no-print', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Export</p>
          <h3 className="text-base font-semibold text-foreground">Branded PDF / HTML</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure sections, colors, and orientation on the export screen. Completed jobs can be downloaded here.
          </p>
        </div>
        <Link to={`/export/${reportId}`} className="inline-flex">
          <Button type="button" variant="secondary" className="gap-2">
            <Settings2 className="h-4 w-4" />
            PDF settings
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Loading export history…
        </div>
      ) : latest ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <Badge variant="success">Latest ready</Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(latest.updated_at ?? latest.created_at).toLocaleString()}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={refreshUrl.isPending}
            className="h-9 gap-2 px-3 py-2 text-sm"
            onClick={async () => {
              const res = await refreshUrl.mutateAsync({ exportId: latest.id })
              const u = res?.data?.signedUrl
              if (typeof u === 'string') setLocalUrl(u)
            }}
          >
            {refreshUrl.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Get download link
          </Button>
          {localUrl ? (
            <a
              href={localUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/90"
            >
              Open file
            </a>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No completed exports yet — run an export from PDF settings.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Export jobs are processed server-side; you will receive an in-app notification when a new file is ready.
      </p>
    </Card>
  )
}
