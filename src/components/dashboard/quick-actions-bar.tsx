import { Link } from 'react-router-dom'
import { FileDown, Plug, RefreshCw, Settings, Sparkles, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface QuickActionsBarProps {
  companyId: string
  hasLatestReport: boolean
  latestReportId?: string | null
  isRefreshingScore?: boolean
  onRefreshScore?: () => void
  className?: string
}

export function QuickActionsBar({
  companyId,
  hasLatestReport,
  latestReportId,
  isRefreshingScore,
  onRefreshScore,
  className,
}: QuickActionsBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {onRefreshScore ? (
        <Button
          type="button"
          variant="secondary"
          className="gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
          disabled={!companyId || isRefreshingScore}
          onClick={() => onRefreshScore()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh score
        </Button>
      ) : null}
      <Button asChild variant="primary" className="gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100">
        <Link to="/generate">
          <Sparkles className="h-4 w-4" aria-hidden />
          Generate analysis
        </Link>
      </Button>
      <Button asChild variant="secondary" className="gap-2">
        <Link to="/company/wizard/edit">
          <Pencil className="h-4 w-4" aria-hidden />
          Edit company
        </Link>
      </Button>
      {hasLatestReport && latestReportId ? (
        <Button asChild variant="secondary" className="gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100">
          <Link to={`/export/${latestReportId}`}>
            <FileDown className="h-4 w-4" aria-hidden />
            Export PDF
          </Link>
        </Button>
      ) : null}
      <Button asChild variant="secondary" className="gap-2">
        <Link to="/settings">
          <Plug className="h-4 w-4" aria-hidden />
          Integrations
        </Link>
      </Button>
      <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
        <Link to="/settings#danger">
          <Settings className="h-4 w-4" aria-hidden />
          Settings
        </Link>
      </Button>
    </div>
  )
}
