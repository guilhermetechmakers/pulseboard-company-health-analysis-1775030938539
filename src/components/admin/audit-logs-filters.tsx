import type { FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ENTITY_HINTS = [
  'application',
  'auth',
  'billing',
  'error',
  'error_boundary',
  'integration',
  'security',
] as const

export type AuditLogsFilterValues = {
  actorId: string
  action: string
  targetType: string
  startDate: string
  endDate: string
  search: string
}

interface AuditLogsFiltersProps {
  values: AuditLogsFilterValues
  onChange: (next: AuditLogsFilterValues) => void
  onApply: () => void
  onReset: () => void
  disabled?: boolean
}

export function AuditLogsFilters({ values, onChange, onApply, onReset, disabled }: AuditLogsFiltersProps) {
  const patch = (partial: Partial<AuditLogsFilterValues>) => {
    onChange({ ...values, ...partial })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onApply()
  }

  return (
    <Card className="surface-card border-border/80 p-4 shadow-card animate-fade-in-up motion-reduce:animate-none">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Filters</h2>
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="Filters apply to the current table export and CSV/JSON download."
          >
            <Info className="h-3.5 w-3.5 text-primary" aria-hidden />
            Scoped to export
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-search">Keyword</Label>
            <Input
              id="audit-search"
              placeholder="Action, entity, notes…"
              value={values.search}
              onChange={(e) => patch({ search: e.target.value })}
              disabled={disabled}
              className="rounded-lg"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action contains</Label>
            <Input
              id="audit-action"
              placeholder="e.g. client_runtime_error"
              value={values.action}
              onChange={(e) => patch({ action: e.target.value })}
              disabled={disabled}
              className="rounded-lg"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-entity">Target / entity type</Label>
            <Input
              id="audit-entity"
              placeholder={ENTITY_HINTS.join(', ')}
              value={values.targetType}
              onChange={(e) => patch({ targetType: e.target.value })}
              disabled={disabled}
              className="rounded-lg"
              list="audit-entity-hints"
              autoComplete="off"
            />
            <datalist id="audit-entity-hints">
              {(ENTITY_HINTS ?? []).map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-actor">Actor user ID</Label>
            <Input
              id="audit-actor"
              placeholder="UUID of auth user"
              value={values.actorId}
              onChange={(e) => patch({ actorId: e.target.value })}
              disabled={disabled}
              className="rounded-lg"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-start">Start date</Label>
            <Input
              id="audit-start"
              type="date"
              value={values.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              disabled={disabled}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-end">End date</Label>
            <Input
              id="audit-end"
              type="date"
              value={values.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              disabled={disabled}
              className="rounded-lg"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={disabled} className="h-9 px-4 text-sm">
            Apply filters
          </Button>
          <Button type="button" variant="secondary" className="h-9 px-4 text-sm" disabled={disabled} onClick={onReset}>
            Reset
          </Button>
        </div>
      </form>
    </Card>
  )
}
