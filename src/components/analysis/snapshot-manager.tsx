import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReportSnapshotRow } from '@/types/analysis'

interface SnapshotManagerProps {
  snapshots: ReportSnapshotRow[]
  onCreate: (label: string) => void | Promise<void>
  isCreating?: boolean
}

export function SnapshotManager({ snapshots, onCreate, isCreating }: SnapshotManagerProps) {
  const [label, setLabel] = useState('Working copy')
  const list = Array.isArray(snapshots) ? snapshots : []

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h3 className="text-base font-semibold">Report snapshots</h3>
        <p className="text-sm text-muted-foreground">Save a versioned copy of your edited sections for audit or client delivery.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Snapshot label" className="max-w-xs" />
        <Button type="button" disabled={isCreating} onClick={() => onCreate(label || 'Snapshot')}>
          {isCreating ? 'Saving…' : 'Save snapshot'}
        </Button>
      </div>
      <ul className="space-y-2 text-sm">
        {list.length === 0 ? (
          <li className="text-muted-foreground">No snapshots yet.</li>
        ) : (
          list.map((s) => (
            <li key={s.id} className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
            </li>
          ))
        )}
      </ul>
    </Card>
  )
}
