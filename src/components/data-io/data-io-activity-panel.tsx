import { Link } from 'react-router-dom'
import { Download, FileUp, History } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompanyExportJobs, useCompanyImportJobs } from '@/hooks/use-data-io-jobs'
import { cn } from '@/lib/utils'

export interface DataIoActivityPanelProps {
  companyId: string
  className?: string
}

export function DataIoActivityPanel({ companyId, className }: DataIoActivityPanelProps) {
  const { data: imports = [], isLoading: impLoading } = useCompanyImportJobs(companyId)
  const { data: exports = [], isLoading: expLoading } = useCompanyExportJobs(companyId)

  const safeImports = Array.isArray(imports) ? imports : []
  const safeExports = Array.isArray(exports) ? exports : []

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Import & export activity</h3>
          <p className="text-sm text-muted-foreground">
            Recent CSV jobs tied to this workspace. Full consoles support mapping, presets, and audit-friendly exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="min-h-[44px] gap-2">
            <Link to="/data/import">
              <FileUp className="h-4 w-4" aria-hidden />
              Import console
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[44px] gap-2">
            <Link to="/data/export">
              <Download className="h-4 w-4" aria-hidden />
              Export console
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-primary" aria-hidden />
            Imports
          </div>
          {impLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : safeImports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No import jobs yet.</p>
          ) : (
            <ul className="space-y-3 text-sm" aria-label="Recent imports">
              {safeImports.slice(0, 5).map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 transition-shadow duration-200 hover:shadow-sm"
                >
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-medium">{row.file_name}</span>
                    <span className="shrink-0 text-muted-foreground">{row.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.target_model ?? '—'} · {row.rows_processed} rows
                  </div>
                  <Progress value={Number(row.progress)} className="mt-2 h-1" />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Download className="h-4 w-4 text-primary" aria-hidden />
            Exports
          </div>
          {expLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : safeExports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No export jobs yet.</p>
          ) : (
            <ul className="space-y-3 text-sm" aria-label="Recent exports">
              {safeExports.slice(0, 5).map((row) => {
                const scope = row.scope && typeof row.scope === 'object' ? row.scope : {}
                const preset = 'preset' in scope ? String((scope as Record<string, unknown>).preset ?? '') : ''
                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 transition-shadow duration-200 hover:shadow-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">{preset || 'export'}</span>
                      <span className="shrink-0 text-muted-foreground">{row.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.format} · {row.result_size != null ? `${row.result_size} bytes` : '—'}
                    </div>
                    <Progress value={Number(row.progress)} className="mt-2 h-1" />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
