import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DashboardReportSnippet } from '@/types/dashboard'
import type { ReportRow } from '@/types/analysis'

export interface RecentReportsListProps {
  reports: (DashboardReportSnippet | ReportRow)[]
  className?: string
  pageSize?: number
}

function reportId(r: DashboardReportSnippet | ReportRow): string {
  return r.id
}

function fmtWhen(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy · HH:mm')
  } catch {
    return iso.slice(0, 16)
  }
}

export function RecentReportsList({ reports, className, pageSize = 5 }: RecentReportsListProps) {
  const [visible, setVisible] = useState(pageSize)
  const list = Array.isArray(reports) ? reports : []
  const slice = list.slice(0, visible)
  const hasMore = list.length > visible

  const shareUrl = (id: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/report/${id}`
  }

  const onCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(id))
      toast.success('Report link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <Card className={cn('border-border/80 p-6 transition-shadow duration-200 hover:shadow-md', className)}>
      <h2 className="text-lg font-semibold tracking-tight">Recent reports</h2>
      <p className="mb-4 text-sm text-muted-foreground">Scoped to your company. Open, export, or share a read link.</p>
      {slice.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports yet.</p>
      ) : (
        <ul className="space-y-3" aria-label="Recent reports">
          {slice.map((r) => (
            <li
              key={reportId(r)}
              className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3 transition-colors duration-200 hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">Report · {r.status ?? 'unknown'}</p>
                <p className="text-xs text-muted-foreground">{fmtWhen(r.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button asChild variant="secondary" className="h-9 gap-1 px-2 py-2 text-xs hover:scale-100">
                  <Link to={`/report/${reportId(r)}`}>
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    View
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-9 gap-1 px-2 py-2 text-xs hover:scale-100">
                  <Link to={`/export/${reportId(r)}`}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    PDF
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 gap-1 px-2 py-2 text-xs hover:scale-100"
                  onClick={() => void onCopy(reportId(r))}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy link
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMore ? (
        <Button type="button" variant="ghost" className="mt-4 w-full text-sm" onClick={() => setVisible((v) => v + pageSize)}>
          Load more
        </Button>
      ) : null}
      <div className="mt-4 text-center">
        <Button asChild variant="ghost" className="text-sm text-primary hover:text-primary">
          <Link to="/company?tab=reports">All reports in workspace</Link>
        </Button>
      </div>
    </Card>
  )
}
