import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { ReportSnapshotRow } from '@/types/analysis'

export interface SnapshotManagerProps {
  snapshots: ReportSnapshotRow[]
  onCreate: (label: string, notes: string) => void | Promise<void>
  onRestore?: (snapshot: ReportSnapshotRow) => void | Promise<void>
  isCreating?: boolean
  isRestoring?: boolean
}

export function SnapshotManager({
  snapshots,
  onCreate,
  onRestore,
  isCreating,
  isRestoring,
}: SnapshotManagerProps) {
  const [label, setLabel] = useState('Working copy')
  const [notes, setNotes] = useState('')
  const list = Array.isArray(snapshots) ? snapshots : []

  return (
    <Card id="section-snapshots" className="scroll-mt-24 space-y-4 border-border/80 p-4 shadow-card">
      <div>
        <h3 className="text-base font-semibold text-foreground">Report snapshots</h3>
        <p className="text-sm text-muted-foreground">
          Save a versioned copy of your edited sections for audit or client delivery. Restore overwrites the current report
          narrative (server-validated).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="snapshot-label">Label</Label>
          <Input
            id="snapshot-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Snapshot label"
            className="rounded-lg"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="snapshot-notes">Notes (optional)</Label>
          <Textarea
            id="snapshot-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context for this version (internal)"
            rows={2}
            className="min-h-0 rounded-lg"
          />
        </div>
      </div>
      <Button
        type="button"
        disabled={isCreating}
        className="transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
        onClick={() => onCreate(label.trim() || 'Snapshot', notes.trim())}
      >
        {isCreating ? 'Saving…' : 'Save snapshot'}
      </Button>
      <ul className="space-y-2 text-sm">
        {list.length === 0 ? (
          <li className="text-muted-foreground">No snapshots yet.</li>
        ) : (
          list.map((s) => {
            const noteText = typeof s.notes === 'string' && s.notes.trim() ? s.notes : null
            return (
              <li
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  {noteText ? <p className="mt-1 text-xs text-muted-foreground">{noteText}</p> : null}
                </div>
                {onRestore ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isRestoring}
                    className="h-9 shrink-0 px-3 py-2 text-sm"
                    onClick={() => onRestore(s)}
                  >
                    {isRestoring ? 'Restoring…' : 'Restore'}
                  </Button>
                ) : null}
              </li>
            )
          })
        )}
      </ul>
    </Card>
  )
}
