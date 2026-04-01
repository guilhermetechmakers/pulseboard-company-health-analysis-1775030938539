import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, Play, Trash2 } from 'lucide-react'
import { previewPulseEntity } from '@/api/search'
import type { SearchItem } from '@/types/search'
import { searchI18n } from '@/lib/search-i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return (cells ?? [])
    .map((c) => {
      const s = c === null || c === undefined ? '' : String(c)
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    })
    .join(',')
}

function exportCsv(filename: string, raw: Record<string, unknown>) {
  const keys = Object.keys(raw ?? {})
  const lines = [toCsvRow(keys), toCsvRow(keys.map((k) => raw[k] as string | number | null | undefined))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function SearchDetailDialog({
  open,
  onOpenChange,
  item,
  isAdmin,
  userId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: SearchItem | null
  isAdmin: boolean
  userId: string | undefined
}) {
  const queryClient = useQueryClient()

  const { data: preview, isLoading } = useQuery({
    queryKey: ['pulse-search', 'preview', item?.id, item?.type],
    enabled: open && Boolean(item?.id && item?.type),
    queryFn: ({ signal }) => previewPulseEntity(item!.id, item!.type, signal),
  })

  const canDeleteCompany =
    item?.type === 'company' && userId && item.ownerId === userId

  const openHref =
    item?.type === 'company'
      ? '/company'
      : item?.type === 'report'
        ? `/report/${item.id}`
        : isAdmin
          ? '/admin/users'
          : '/profile'

  const handleDeleteCompany = async () => {
    if (!item || item.type !== 'company' || !supabase) return
    const ok = window.confirm('Permanently delete this company and related data? This cannot be undone.')
    if (!ok) return
    const { error } = await supabase.from('companies').delete().eq('id', item.id)
    if (error) {
      toast.error(error.message ?? 'Delete failed')
      return
    }
    toast.success('Company removed')
    await queryClient.invalidateQueries({ queryKey: ['pulse-search'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" aria-describedby="search-detail-desc">
        <DialogHeader>
          <DialogTitle>{item?.title ?? searchI18n.openDetail}</DialogTitle>
          <DialogDescription id="search-detail-desc">
            {preview?.summary ?? item?.subtitle ?? 'Preview and actions for this record.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : null}

        {!isLoading && preview ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-mono text-[11px]">{preview.type}</span> · <span className="font-mono">{preview.id}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" className="gap-1" asChild>
            <Link to={openHref} onClick={() => onOpenChange(false)}>
              {searchI18n.openPage}
            </Link>
          </Button>
          {item?.type === 'report' ? (
            <Button type="button" variant="secondary" className="gap-1" asChild>
              <Link to="/analysis/generate" onClick={() => onOpenChange(false)}>
                <Play className="h-4 w-4" aria-hidden />
                {searchI18n.runAnalysis}
              </Link>
            </Button>
          ) : null}
          {preview?.raw ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="gap-1"
                onClick={() => downloadJson(`pulseboard-${item?.type ?? 'export'}-${item?.id ?? 'data'}.json`, preview.raw)}
              >
                <Download className="h-4 w-4" aria-hidden />
                {searchI18n.exportJson}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-1 text-xs"
                onClick={() => exportCsv(`pulseboard-${item?.type ?? 'export'}-${item?.id ?? 'data'}.csv`, preview.raw)}
              >
                Export CSV
              </Button>
            </>
          ) : null}
          {canDeleteCompany ? (
            <Button type="button" variant="secondary" className="gap-1 text-destructive" onClick={() => void handleDeleteCompany()}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
