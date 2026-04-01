import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import { AuditLogDetailDrawer } from '@/components/admin/audit-log-detail-drawer'
import { AuditLogVolumeChart } from '@/components/admin/audit-log-volume-chart'
import { AuditLogsFilters, type AuditLogsFilterValues } from '@/components/admin/audit-logs-filters'
import { AuditLogsTable } from '@/components/admin/audit-logs-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuditLogsQuery, useAuditLogsStatsQuery, useExportAuditLogsMutation } from '@/hooks/use-audit-logs'
import { isValidUuid } from '@/lib/audit-log-validation'
import type { AuditLogApiRow } from '@/types/audit-log'

const DEFAULT_FILTERS: AuditLogsFilterValues = {
  actorId: '',
  action: '',
  targetType: '',
  startDate: '',
  endDate: '',
  search: '',
}

function triggerDownload(url: string, filename: string) {
  if (typeof document === 'undefined') return
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function AdminAuditLogsPage() {
  const [draft, setDraft] = useState<AuditLogsFilterValues>(DEFAULT_FILTERS)
  const [applied, setApplied] = useState<AuditLogsFilterValues>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [sort, setSort] = useState<'asc' | 'desc'>('desc')
  const [detail, setDetail] = useState<AuditLogApiRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      actorId:
        applied.actorId.trim() && isValidUuid(applied.actorId.trim()) ? applied.actorId.trim() : undefined,
      action: applied.action.trim() || undefined,
      targetType: applied.targetType.trim() || undefined,
      startDate: applied.startDate.trim() || undefined,
      endDate: applied.endDate.trim() || undefined,
      search: applied.search.trim() || undefined,
      sort,
    }),
    [applied, page, pageSize, sort],
  )

  const listQuery = useAuditLogsQuery(listParams)
  const statsQuery = useAuditLogsStatsQuery()
  const exportMutation = useExportAuditLogsMutation()

  const logs = useMemo(() => {
    const raw = listQuery.data?.logs
    return Array.isArray(raw) ? raw : []
  }, [listQuery.data?.logs])

  const total = typeof listQuery.data?.total === 'number' ? listQuery.data.total : 0

  const exportFilters = useMemo(
    () => ({
      actorId:
        applied.actorId.trim() && isValidUuid(applied.actorId.trim()) ? applied.actorId.trim() : '',
      actionFilter: applied.action.trim(),
      targetType: applied.targetType.trim(),
      entity: applied.targetType.trim(),
      startDate: applied.startDate.trim(),
      endDate: applied.endDate.trim(),
      search: applied.search.trim(),
      sort,
    }),
    [applied, sort],
  )

  const handleExport = useCallback(
    (format: 'csv' | 'json') => {
      const p = toast.loading(format === 'csv' ? 'Preparing CSV…' : 'Preparing JSON…')
      exportMutation.mutate(
        { format, filters: exportFilters },
        {
          onSuccess: (res) => {
            toast.dismiss(p)
            const url = typeof res?.url === 'string' ? res.url : ''
            if (!url) {
              toast.error('Export failed — no download URL returned.')
              return
            }
            triggerDownload(url, `audit-logs.${format}`)
            toast.success('Export ready — download started.')
          },
          onError: (e) => {
            toast.dismiss(p)
            toast.error(e instanceof Error ? e.message : 'Export failed.')
          },
        },
      )
    },
    [exportFilters, exportMutation],
  )

  const applyFilters = useCallback(() => {
    if (draft.actorId.trim() && !isValidUuid(draft.actorId.trim())) {
      toast.error('Actor user ID must be a valid UUID or left empty.')
      return
    }
    setApplied({ ...draft })
    setPage(1)
  }, [draft])

  const resetFilters = useCallback(() => {
    setDraft(DEFAULT_FILTERS)
    setApplied(DEFAULT_FILTERS)
    setPage(1)
  }, [])

  return (
    <div className="space-y-8 pb-10 animate-fade-in-up motion-reduce:animate-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" asChild className="-ml-2 mb-2 h-9 gap-1 px-2 text-muted-foreground">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Admin overview
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit logs</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Immutable security and compliance trail with filters, exports, and client error correlation. Access is restricted
            to administrators.
          </p>
        </div>
      </div>

      <section aria-label="Audit log summary" className="grid gap-4 sm:grid-cols-3">
        {statsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : statsQuery.isError ? (
          <Card className="surface-card border-destructive/30 p-4 text-sm text-destructive sm:col-span-3">
            Could not load audit statistics.
          </Card>
        ) : (
          <>
            <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md">
              <p className="text-xs font-medium text-muted-foreground">All events</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {(statsQuery.data?.total ?? 0).toLocaleString()}
              </p>
            </Card>
            <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md">
              <p className="text-xs font-medium text-muted-foreground">Last 24 hours</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {(statsQuery.data?.last24h ?? 0).toLocaleString()}
              </p>
            </Card>
            <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md">
              <p className="text-xs font-medium text-muted-foreground">Matching filters</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{total.toLocaleString()}</p>
            </Card>
          </>
        )}
      </section>

      <AuditLogVolumeChart series={statsQuery.data?.series ?? []} />

      <AuditLogsFilters
        values={draft}
        onChange={setDraft}
        onApply={applyFilters}
        onReset={resetFilters}
        disabled={listQuery.isFetching}
      />

      {listQuery.isError ? (
        <Card className="surface-card border-destructive/30 p-4 text-sm text-destructive">
          Could not load audit logs. Deploy the <code className="rounded bg-muted px-1">admin-api</code> Edge Function and ensure your
          profile role is <code className="rounded bg-muted px-1">admin</code>.
        </Card>
      ) : (
        <AuditLogsTable
          logs={logs}
          isLoading={listQuery.isLoading}
          page={page}
          pageSize={pageSize}
          total={total}
          sort={sort}
          onSortChange={(s: 'asc' | 'desc') => {
            setSort(s)
            setPage(1)
          }}
          onPageChange={setPage}
          onView={(row) => {
            setDetail(row)
            setDrawerOpen(true)
          }}
          onExportCsv={() => handleExport('csv')}
          onExportJson={() => handleExport('json')}
          isExporting={exportMutation.isPending}
        />
      )}

      <AuditLogDetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o)
          if (!o) setDetail(null)
        }}
        row={detail}
      />
    </div>
  )
}
