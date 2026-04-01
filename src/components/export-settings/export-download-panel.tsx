import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ExportDownloadPanelProps {
  signedUrl: string
  formatLabel: string
  fileNameHint?: string
  fileSizeBytes?: number | null
  onRefreshLink: () => void
  isRefreshing?: boolean
  className?: string
}

function formatBytes(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !Number.isFinite(n) || n < 0) return null
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function ExportDownloadPanel({
  signedUrl,
  formatLabel,
  fileNameHint,
  fileSizeBytes,
  onRefreshLink,
  isRefreshing,
  className,
}: ExportDownloadPanelProps) {
  const [copied, setCopied] = useState(false)
  const sizeLabel = formatBytes(fileSizeBytes ?? null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(signedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 animate-fade-in motion-reduce:animate-none',
        className,
      )}
    >
      {fileNameHint ? <p className="text-xs font-medium text-foreground">{fileNameHint}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="primary" className="gap-2 transition-transform duration-200 hover:scale-[1.02]">
          <a href={signedUrl} target="_blank" rel="noreferrer" download>
            <Download className="h-4 w-4" aria-hidden />
            Download {formatLabel}
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => void copy()}
          aria-label="Copy download link"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button type="button" variant="outline" onClick={onRefreshLink} disabled={isRefreshing}>
          Refresh link
        </Button>
      </div>
      {sizeLabel ? (
        <p className="text-xs text-muted-foreground">
          Approx. file size: {sizeLabel}. Signed links expire — refresh if needed.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Signed link expires — use refresh if the download stops working.</p>
      )}
    </div>
  )
}
