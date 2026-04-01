import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportUsersControlsProps {
  disabled?: boolean
  isJobRunning?: boolean
  onSyncExport: (format: 'csv' | 'json', scope: 'filtered' | 'full') => void
  onStartJob: (format: 'csv' | 'json', scope: 'filtered' | 'full') => void
}

/** CSV/JSON export: immediate download or job + poll (handled by parent). */
export function ExportUsersControls({
  disabled,
  isJobRunning,
  onSyncExport,
  onStartJob,
}: ExportUsersControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Export</span>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-9 gap-1 px-3 text-xs transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
          disabled={disabled}
          onClick={() => {
            toast.message('Preparing CSV…')
            onSyncExport('csv', 'filtered')
          }}
          aria-label="Export CSV with current filters"
        >
          <Download className="h-4 w-4" aria-hidden />
          CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-9 gap-1 px-3 text-xs transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
          disabled={disabled}
          onClick={() => {
            toast.message('Preparing JSON…')
            onSyncExport('json', 'filtered')
          }}
          aria-label="Export JSON with current filters"
        >
          <Download className="h-4 w-4" aria-hidden />
          JSON
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-9 gap-1 px-3 text-xs transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
          disabled={disabled}
          onClick={() => {
            toast.message('Preparing full CSV…')
            onSyncExport('csv', 'full')
          }}
          aria-label="Export full user CSV"
        >
          <Download className="h-4 w-4" aria-hidden />
          Full CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-9 gap-1 px-3 text-xs transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
          disabled={disabled || isJobRunning}
          onClick={() => {
            toast.message('Export job started')
            onStartJob('csv', 'filtered')
          }}
          aria-label="Start queued CSV export with current filters"
        >
          {isJobRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          Job CSV
        </Button>
      </div>
    </div>
  )
}

/** Spec alias: export controls for user CSV/JSON and job-backed export. */
export { ExportUsersControls as ExportButton }
