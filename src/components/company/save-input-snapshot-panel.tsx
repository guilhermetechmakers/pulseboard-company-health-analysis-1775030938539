import { useState } from 'react'
import { Camera, History } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCompanyInputSnapshots,
  useRestoreCompanyInputSnapshot,
  useSaveCompanyInputSnapshot,
} from '@/hooks/use-health-scores'
import type { CompanyRow } from '@/types/integrations'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type FinancialsRow = Database['public']['Tables']['company_financials']['Row']
type MarketRow = Database['public']['Tables']['company_market_data']['Row']
type SocialRow = Database['public']['Tables']['company_social']['Row']

export interface SaveInputSnapshotPanelProps {
  companyId: string
  company: CompanyRow
  financials: FinancialsRow | null
  market: MarketRow | null
  social: SocialRow | null
  className?: string
}

export function SaveInputSnapshotPanel({
  companyId,
  company,
  financials,
  market,
  social,
  className,
}: SaveInputSnapshotPanelProps) {
  const [label, setLabel] = useState('Workspace snapshot')
  const save = useSaveCompanyInputSnapshot()
  const restore = useRestoreCompanyInputSnapshot()
  const { data: snapshots = [], isLoading } = useCompanyInputSnapshots(companyId)
  const safeSnapshots = Array.isArray(snapshots) ? snapshots : []

  return (
    <Card className={cn('border-border/80 p-6 shadow-card', className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Camera className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Input snapshots</h2>
          <p className="text-sm text-muted-foreground">
            Save the current profile, financials, market, and social rows for quick restore later.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="snapshot-label">Snapshot label</Label>
          <Input
            id="snapshot-label"
            value={label}
            onChange={(ev) => setLabel(ev.target.value)}
            placeholder="e.g. Pre-fundraise baseline"
            className="rounded-lg"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          className="min-h-[44px] shrink-0 transition-transform duration-200 hover:scale-[1.02]"
          disabled={save.isPending || !label.trim()}
          onClick={() =>
            void save.mutateAsync({
              companyId,
              label: label.trim(),
              company,
              financials,
              market,
              social,
            })
          }
        >
          Save snapshot
        </Button>
      </div>

      <div className="mt-6 border-t border-border/60 pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden />
          Saved versions
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : safeSnapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snapshots yet.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {safeSnapshots.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[40px] shrink-0 px-3 py-2 text-sm"
                  disabled={restore.isPending}
                  onClick={() => void restore.mutateAsync({ snapshot: s, companyId })}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
