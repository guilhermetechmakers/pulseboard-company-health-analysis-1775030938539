import { ChevronLeft, ChevronRight, Eye, FileJson, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AuditLogApiRow } from '@/types/audit-log'

export interface AuditLogsTableProps {
  logs: AuditLogApiRow[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  sort: 'asc' | 'desc'
  onSortChange: (sort: 'asc' | 'desc') => void
  onPageChange: (page: number) => void
  onView: (row: AuditLogApiRow) => void
  onExportCsv: () => void
  onExportJson: () => void
  isExporting?: boolean
}

function targetPreview(row: AuditLogApiRow): string {
  try {
    const s = JSON.stringify(row.target ?? {})
    return s.length > 96 ? `${s.slice(0, 96)}…` : s
  } catch {
    return '—'
  }
}

export function AuditLogsTable({
  logs,
  isLoading,
  page,
  pageSize,
  total,
  sort,
  onSortChange,
  onPageChange,
  onView,
  onExportCsv,
  onExportJson,
  isExporting,
}: AuditLogsTableProps) {
  const safeLogs = Array.isArray(logs) ? logs : []
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <Card className="surface-card overflow-hidden border-border/80 shadow-card animate-fade-in-up motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Event log</h2>
          <p className="text-xs text-muted-foreground">
            {(total ?? 0).toLocaleString()} matching rows · page {page} of {totalPages}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9 gap-1.5 px-3 text-xs"
            disabled={!!isExporting}
            onClick={onExportCsv}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 gap-1.5 px-3 text-xs"
            disabled={!!isExporting}
            onClick={onExportJson}
          >
            <FileJson className="h-4 w-4" aria-hidden />
            JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3 text-xs"
            onClick={() => onSortChange(sort === 'desc' ? 'asc' : 'desc')}
          >
            Sort: {sort === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur-sm">
            <tr className="border-b border-border/60">
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Created
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Actor
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Action
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Entity
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Target
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Notes
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <div className="space-y-2" aria-busy="true">
                    {(Array.from({ length: 5 }) ?? []).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : safeLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No audit logs match the current filters.
                </td>
              </tr>
            ) : (
              safeLogs.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border/40 transition-colors duration-150',
                    'hover:bg-muted/50 motion-reduce:transition-none',
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <div className="truncate font-medium text-foreground">{row.actorName || '—'}</div>
                    {row.actorEmail ? <div className="truncate text-xs text-muted-foreground">{row.actorEmail}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.action}</td>
                  <td className="max-w-[100px] break-words px-4 py-3 text-xs text-foreground">
                    {typeof row.target?.entity === 'string' ? row.target.entity : '—'}
                  </td>
                  <td className="max-w-[240px] px-4 py-3 font-mono text-xs text-muted-foreground" title={targetPreview(row)}>
                    {targetPreview(row)}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground">{row.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-xs"
                      onClick={() => onView(row)}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <Button
          type="button"
          variant="secondary"
          className="h-9 gap-1 px-3 text-xs"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          className="h-9 gap-1 px-3 text-xs"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </Card>
  )
}
