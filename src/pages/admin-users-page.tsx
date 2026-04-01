import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminUserAnalyticsStrip } from '@/components/admin/user-management/admin-user-analytics-strip'
import { AdminUsersTable, type AdminUserSortKey } from '@/components/admin/user-management/admin-users-table'
import { ExportUsersControls } from '@/components/admin/user-management/export-users-controls'
import { ImpersonationGuardDialog } from '@/components/admin/user-management/impersonation-guard-dialog'
import { SuspendUserDialog } from '@/components/admin/user-management/suspend-user-dialog'
import { UserDetailModal } from '@/components/admin/user-management/user-detail-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAdminCompaniesPicklistQuery,
  useAdminUsersExportJobStatus,
  useAdminUsersQuery,
  useExportAdminUsers,
  usePatchAdminUser,
  useStartAdminUsersExportJob,
} from '@/hooks/use-admin-users'
import type { AdminUserRow } from '@/types/admin'

const PAGE_SIZE = 10

/** Admin — user management (spec name: `AdminUserManagementPage`). */
export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [companyId, setCompanyId] = useState('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState<AdminUserSortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null)
  const [pendingSuspend, setPendingSuspend] = useState<AdminUserRow | null>(null)
  const [impersonateUser, setImpersonateUser] = useState<AdminUserRow | null>(null)
  const [exportJobId, setExportJobId] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role, status, companyId, createdFrom, createdTo])

  const picklistQ = useAdminCompaniesPicklistQuery()
  const companies = Array.isArray(picklistQ.data) ? picklistQ.data : []

  const query = useAdminUsersQuery({
    page,
    pageSize: PAGE_SIZE,
    role,
    status,
    search: debouncedSearch,
    createdFrom: createdFrom.trim() || undefined,
    createdTo: createdTo.trim() || undefined,
    companyId: companyId !== 'all' ? companyId : undefined,
  })

  const patch = usePatchAdminUser()
  const exportMutation = useExportAdminUsers()
  const startJob = useStartAdminUsersExportJob()
  const jobStatusQ = useAdminUsersExportJobStatus(exportJobId, Boolean(exportJobId))

  useEffect(() => {
    const d = jobStatusQ.data
    if (!d) return
    if (d.status === 'completed' && d.downloadUrl) {
      const a = document.createElement('a')
      a.href = d.downloadUrl
      a.download = 'pulseboard-users-export.csv'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.success('Export ready')
      setExportJobId(null)
    }
    if (d.status === 'failed') {
      toast.error(d.errorMessage)
      setExportJobId(null)
    }
  }, [jobStatusQ.data])

  const filterPayload = useMemo(
    () => ({
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
      createdFrom: createdFrom.trim() || undefined,
      createdTo: createdTo.trim() || undefined,
      companyId: companyId !== 'all' ? companyId : undefined,
    }),
    [role, status, createdFrom, createdTo, companyId],
  )

  const rows = useMemo(() => {
    const list = Array.isArray(query.data?.data) ? [...query.data.data] : []
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const av =
        sortKey === 'email'
          ? a.email
          : sortKey === 'role'
            ? a.role
            : sortKey === 'lastLogin'
              ? a.lastLogin || a.lastActiveAt || ''
              : a.createdAt
      const bv =
        sortKey === 'email'
          ? b.email
          : sortKey === 'role'
            ? b.role
            : sortKey === 'lastLogin'
              ? b.lastLogin || b.lastActiveAt || ''
              : b.createdAt
      return av.localeCompare(bv) * dir
    })
    return list
  }, [query.data?.data, sortKey, sortDir])

  const total = typeof query.data?.total === 'number' ? query.data.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const toggleSort = useCallback((key: AdminUserSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('desc')
      return key
    })
  }, [])

  const handleRoleChange = (u: AdminUserRow, nextRole: string) => {
    patch.mutate(
      { userId: u.id, role: nextRole },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
      },
    )
  }

  const confirmSuspendToggle = (u: AdminUserRow) => {
    const next = u.status === 'suspended' ? 'active' : 'suspended'
    patch.mutate(
      { userId: u.id, status: next },
      {
        onSuccess: () => {
          toast.success(next === 'suspended' ? 'User suspended' : 'User reactivated')
          setPendingSuspend(null)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
      },
    )
  }

  const handleSyncExport = (format: 'csv' | 'json', scope: 'filtered' | 'full') => {
    exportMutation.mutate(
      { format, scope, filters: { ...filterPayload } },
      {
        onSuccess: (res) => {
          const url = typeof res?.url === 'string' ? res.url : ''
          if (!url) {
            toast.error('Export returned no URL')
            return
          }
          const a = document.createElement('a')
          a.href = url
          a.download = `pulseboard-users.${format}`
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
          toast.success('Export ready')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Export failed'),
      },
    )
  }

  const handleStartJob = (format: 'csv' | 'json', scope: 'filtered' | 'full') => {
    startJob.mutate(
      { format, scope, filters: { ...filterPayload } },
      {
        onSuccess: (r) => {
          const id = typeof r?.jobId === 'string' ? r.jobId : ''
          if (!id) {
            toast.error('No job id returned')
            return
          }
          setExportJobId(id)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not start export job'),
      },
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up motion-reduce:animate-none">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">User management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, update roles, suspend accounts, and impersonate with audit trails. Exports respect filters or full
          dataset.
        </p>
      </header>

      <AdminUserAnalyticsStrip />

      <Card className="surface-card border-border/80 p-4 shadow-card">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="admin-user-search">Search</Label>
            <Input
              id="admin-user-search"
              placeholder="Email or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border-input"
              aria-describedby="admin-user-search-hint"
            />
            <p id="admin-user-search-hint" className="text-xs text-muted-foreground">
              Debounced to reduce API load.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-role-filter">Role</Label>
            <select
              id="admin-role-filter"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="all">All roles</option>
              {(['founder', 'consultant', 'investor', 'other', 'admin'] as const).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-status-filter">Status</Label>
            <select
              id="admin-status-filter"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-company-filter">Company</Label>
            <select
              id="admin-company-filter"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={picklistQ.isLoading}
              aria-busy={picklistQ.isLoading}
            >
              <option value="all">All companies</option>
              {(companies ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-created-from">Registered from</Label>
            <Input
              id="admin-created-from"
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="rounded-lg border-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-created-to">Registered to</Label>
            <Input
              id="admin-created-to"
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="rounded-lg border-input"
            />
          </div>
          <div className="flex flex-col justify-end xl:col-span-2 2xl:col-span-2">
            <ExportUsersControls
              disabled={exportMutation.isPending}
              isJobRunning={startJob.isPending || Boolean(exportJobId)}
              onSyncExport={handleSyncExport}
              onStartJob={handleStartJob}
            />
          </div>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-destructive/30 p-4 text-sm text-destructive">
          Could not load users. Deploy the <code className="rounded bg-muted px-1">admin-api</code> Edge Function and ensure your
          profile role is <code className="rounded bg-muted px-1">admin</code>.
        </Card>
      ) : (
        <AdminUsersTable
          rows={rows}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          page={page}
          totalPages={totalPages}
          total={total}
          onPagePrev={() => setPage((p) => Math.max(1, p - 1))}
          onPageNext={() => setPage((p) => p + 1)}
          patchPending={patch.isPending}
          onRoleChange={handleRoleChange}
          onOpenDetail={setDetailUser}
          onToggleSuspend={setPendingSuspend}
          onImpersonate={setImpersonateUser}
        />
      )}

      <SuspendUserDialog
        user={pendingSuspend}
        open={Boolean(pendingSuspend)}
        isPending={patch.isPending}
        onClose={() => setPendingSuspend(null)}
        onConfirm={confirmSuspendToggle}
      />

      <UserDetailModal summaryUser={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />

      <ImpersonationGuardDialog
        user={impersonateUser}
        open={Boolean(impersonateUser)}
        onClose={() => setImpersonateUser(null)}
      />

      <p className="text-center text-xs text-muted-foreground">
        <Button variant="ghost" className="h-auto p-0 text-xs font-normal text-primary" asChild>
          <Link to="/admin">← Admin overview</Link>
        </Button>
      </p>
    </div>
  )
}

export { AdminUsersPage as AdminUserManagementPage }
