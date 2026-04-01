import { useEffect } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AuditLogApiRow } from '@/types/audit-log'

export interface AuditLogDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: AuditLogApiRow | null
}

function downloadRowJson(row: AuditLogApiRow) {
  try {
    const blob = new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${row.id}.json`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Row exported')
  } catch {
    toast.error('Could not export row')
  }
}

export function AuditLogDetailDrawer({ open, onOpenChange, row }: AuditLogDetailDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    globalThis.addEventListener?.('keydown', onKey)
    return () => globalThis.removeEventListener?.('keydown', onKey)
  }, [open, onOpenChange])

  if (!open || !row) return null

  let targetJson = '{}'
  try {
    targetJson = JSON.stringify(row.target ?? {}, null, 2)
  } catch {
    targetJson = '{}'
  }

  const entity = typeof row.target?.entity === 'string' ? row.target.entity : ''
  const entityId = typeof row.target?.entityId === 'string' ? row.target.entityId : null

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in motion-reduce:animate-none" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[rgb(15_23_42)]/40 backdrop-blur-[1px] transition-opacity duration-200"
        aria-label="Close detail panel"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          'relative ml-auto flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-card',
          'animate-slide-in-right motion-reduce:animate-none',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 id="audit-detail-title" className="text-lg font-semibold tracking-tight text-foreground">
            Log detail
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 shrink-0 p-0"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-foreground">{row.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Created</dt>
              <dd className="mt-0.5 text-foreground">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Actor</dt>
              <dd className="mt-0.5 text-foreground">
                {(row.actorName ?? '').trim() || '—'}
                {row.actorEmail ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{row.actorEmail}</span>
                ) : null}
                {row.actorId ? (
                  <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">{row.actorId}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Action</dt>
              <dd className="mt-0.5 break-words text-foreground">{row.action || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Entity</dt>
              <dd className="mt-0.5 text-foreground">
                {entity || '—'}
                {entityId ? (
                  <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">{entityId}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-foreground">{row.notes ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Target (JSON)</dt>
              <dd className="mt-1">
                <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
                  {targetJson}
                </pre>
              </dd>
            </div>
          </dl>
        </div>
        <div className="border-t border-border/60 p-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full transition-transform duration-200 hover:scale-[1.01]"
            onClick={() => downloadRowJson(row)}
          >
            Export this row (JSON)
          </Button>
        </div>
      </aside>
    </div>
  )
}
