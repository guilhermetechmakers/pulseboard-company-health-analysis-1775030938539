import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitMerge, ListTree, Radar, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchAdminMultiCompanyUsers,
  fetchAdminTelemetryEvents,
  mergeAdminCompanies,
  runAdminCompaniesMigrateDryRun,
  type AdminMultiCompanyUser,
} from '@/api/admin'
import { adminSetPrimaryCompany } from '@/api/admin-company-consolidation'

export function AdminCompanyConsolidationPage() {
  const queryClient = useQueryClient()
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [primaryUserId, setPrimaryUserId] = useState('')
  const [primaryCompanyId, setPrimaryCompanyId] = useState('')

  const multiQuery = useQuery({
    queryKey: ['admin', 'companies-multi'],
    queryFn: fetchAdminMultiCompanyUsers,
  })

  const telemetryQuery = useQuery({
    queryKey: ['admin', 'telemetry-events'],
    queryFn: () => fetchAdminTelemetryEvents(60),
  })

  const dryRunMutation = useMutation({
    mutationFn: runAdminCompaniesMigrateDryRun,
    onSuccess: () => {
      toast.success('Dry-run recorded in audit logs')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const mergeMutation = useMutation({
    mutationFn: (dryRun: boolean) =>
      mergeAdminCompanies({ sourceCompanyId: sourceId.trim(), targetCompanyId: targetId.trim(), dryRun }),
    onSuccess: (_, dryRun) => {
      toast.success(dryRun ? 'Merge preview OK' : 'Companies merged')
      void multiQuery.refetch()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const setPrimaryMutation = useMutation({
    mutationFn: () =>
      adminSetPrimaryCompany({
        targetUserId: primaryUserId.trim(),
        companyId: primaryCompanyId.trim(),
      }),
    onSuccess: () => {
      toast.success('Primary company context updated')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
      void multiQuery.refetch()
      void queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const users: AdminMultiCompanyUser[] = Array.isArray(multiQuery.data) ? multiQuery.data : []

  return (
    <div className="space-y-8 animate-fade-in motion-reduce:animate-none">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Company consolidation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Detects users with multiple companies (normally blocked by DB uniqueness). Dry-run is audited; merge uses the
          admin platform API.
        </p>
      </div>

      <Card className="border-border/80 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="font-semibold">Duplicate company accounts</h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] gap-2"
            disabled={dryRunMutation.isPending}
            onClick={() => dryRunMutation.mutate()}
          >
            <Radar className="h-4 w-4" aria-hidden />
            Run migration dry-run
          </Button>
        </div>
        {multiQuery.isLoading ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No users with multiple companies in the current view.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm" aria-label="Users with multiple companies">
            {users.map((u) => (
              <li key={u.userId} className="rounded-lg border border-border/80 p-3">
                <p className="font-medium text-foreground">User {u.userId}</p>
                <p className="text-muted-foreground">{u.companyCount} companies · IDs: {(u.companyIds ?? []).join(', ')}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <div className="flex items-center gap-2">
          <GitMerge className="h-5 w-5 text-primary" aria-hidden />
          <h3 className="font-semibold">Manual merge</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Both companies must belong to the same user. Run dry-run first, then execute. Integrations may be dropped on
          provider conflicts.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="merge-source">Source company ID (removed)</Label>
            <Input
              id="merge-source"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="uuid"
              className="rounded-lg font-mono text-sm"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merge-target">Target company ID (kept)</Label>
            <Input
              id="merge-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="uuid"
              className="rounded-lg font-mono text-sm"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px]"
            disabled={mergeMutation.isPending || !sourceId.trim() || !targetId.trim()}
            onClick={() => mergeMutation.mutate(true)}
          >
            Preview (dry-run)
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px] transition-transform duration-200 hover:scale-[1.02]"
            disabled={mergeMutation.isPending || !sourceId.trim() || !targetId.trim()}
            onClick={() => mergeMutation.mutate(false)}
          >
            Execute merge
          </Button>
        </div>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <div className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-primary" aria-hidden />
          <h3 className="font-semibold">Set primary company context</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Updates <code className="rounded bg-muted px-1">profiles.last_context_company_id</code> when a user has legacy
          duplicate company rows so Edge Functions resolve the same workspace as the client header.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-user">Target user ID</Label>
            <Input
              id="primary-user"
              value={primaryUserId}
              onChange={(e) => setPrimaryUserId(e.target.value)}
              placeholder="auth user uuid"
              className="rounded-lg font-mono text-sm"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary-company">Company ID (must belong to user)</Label>
            <Input
              id="primary-company"
              value={primaryCompanyId}
              onChange={(e) => setPrimaryCompanyId(e.target.value)}
              placeholder="company uuid"
              className="rounded-lg font-mono text-sm"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px] transition-transform duration-200 hover:scale-[1.02]"
            disabled={setPrimaryMutation.isPending || !primaryUserId.trim() || !primaryCompanyId.trim()}
            onClick={() => setPrimaryMutation.mutate()}
          >
            Apply primary context
          </Button>
        </div>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="font-semibold">Recent telemetry (company flows)</h3>
        <p className="mt-1 text-xs text-muted-foreground">From `telemetry_events` via pulse-companies-api (admin).</p>
        {telemetryQuery.isLoading ? (
          <Skeleton className="mt-4 h-32 w-full" />
        ) : (
          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-xs" aria-label="Telemetry events">
            {(telemetryQuery.data ?? []).length === 0 ? (
              <li className="text-muted-foreground">No events yet or function not deployed.</li>
            ) : (
              (telemetryQuery.data ?? []).map((ev) => (
                <li key={ev.id} className="rounded border border-border/60 px-2 py-1.5 font-mono">
                  <span className="text-foreground">{ev.event_type}</span>{' '}
                  <span className="text-muted-foreground">{ev.created_at}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </Card>
    </div>
  )
}
