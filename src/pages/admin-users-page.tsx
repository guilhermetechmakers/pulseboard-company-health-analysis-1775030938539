import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Download, ShieldAlert, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useExportAdminUsers, useAdminUsersQuery, usePatchAdminUser } from '@/hooks/use-admin-users'
import type { AdminUserRow } from '@/types/admin'

const ROLE_OPTIONS = ['founder', 'consultant', 'investor', 'other', 'admin'] as const
const PAGE_SIZE = 10

type SortKey = 'email' | 'createdAt' | 'lastLogin' | 'role'

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null)
  const [pendingSuspend, setPendingSuspend] = useState<AdminUserRow | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role, status])

  const query = useAdminUsersQuery({
    page,
    pageSize: PAGE_SIZE,
    role,
    status,
    search: debouncedSearch,
  })

  const patch = usePatchAdminUser()
  const exportMutation = useExportAdminUsers()

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
              ? a.lastLogin || ''
              : a.createdAt
      const bv =
        sortKey === 'email'
          ? b.email
          : sortKey === 'role'
            ? b.role
            : sortKey === 'lastLogin'
              ? b.lastLogin || ''
              : b.createdAt
      return av.localeCompare(bv) * dir
    })
    return list
  }, [query.data?.data, sortKey, sortDir])

  const total = typeof query.data?.total === 'number' ? query.data.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const toggleSort = useCallback((key: SortKey) => {
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

  const handleExport = (format: 'csv' | 'json') => {
    exportMutation.mutate(
      {
        format,
        filters: {
          role: role === 'all' ? undefined : role,
          status: status === 'all' ? undefined : status,
        },
      },
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

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => toggleSort(col)}
    >
      {label}
      {sortKey === col ? sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
    </button>
  )

  return (
    <div className="space-y-6 animate-fade-in-up motion-reduce:animate-none">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">User management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, update roles, and suspend accounts. All changes are audited server-side.
          </p>
        </header>

        <Card className="surface-card border-border/80 p-4 shadow-card">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                {(ROLE_OPTIONS ?? []).map((r) => (
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
            <div className="flex flex-col justify-end gap-2">
              <span className="text-xs font-medium text-muted-foreground">Export</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-1 px-3 text-xs transition-transform duration-200 hover:scale-[1.02]"
                  disabled={exportMutation.isPending}
                  onClick={() => handleExport('csv')}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-1 px-3 text-xs transition-transform duration-200 hover:scale-[1.02]"
                  disabled={exportMutation.isPending}
                  onClick={() => handleExport('json')}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  JSON
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {query.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {(Array.from({ length: 5 }) ?? []).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <Card className="border-destructive/30 p-4 text-sm text-destructive">
            Could not load users. Deploy the <code className="rounded bg-muted px-1">admin-api</code> Edge Function and ensure your
            profile role is <code className="rounded bg-muted px-1">admin</code>.
          </Card>
        ) : (
          <Card className="surface-card overflow-hidden border-border/80 shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      <SortBtn col="email" label="User" />
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <SortBtn col="role" label="Role" />
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <SortBtn col="lastLogin" label="Last login" />
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <SortBtn col="createdAt" label="Created" />
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No users match the current filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((u) => (
                      <tr
                        key={u.id}
                        className="transition-colors duration-150 hover:bg-muted/40 motion-reduce:transition-none"
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-left font-medium text-primary hover:underline"
                            onClick={() => setDetailUser(u)}
                          >
                            {u.email || u.name}
                          </button>
                          <p className="text-xs text-muted-foreground">{u.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="h-9 max-w-[140px] rounded-lg border border-input bg-background px-2 text-xs"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            disabled={patch.isPending}
                            aria-label={`Role for ${u.email}`}
                          >
                            {(ROLE_OPTIONS ?? []).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.status === 'suspended' ? 'destructive' : 'success'}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Switch
                              checked={u.status === 'suspended'}
                              onCheckedChange={() => setPendingSuspend(u)}
                              disabled={patch.isPending}
                              aria-label={u.status === 'suspended' ? 'Unsuspend user' : 'Suspend user'}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Page {page} of {totalPages} · {total} users
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}

        {pendingSuspend ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
            role="presentation"
            onClick={() => setPendingSuspend(null)}
            onKeyDown={(e) => e.key === 'Escape' && setPendingSuspend(null)}
          >
            <Card
              className="max-w-md p-6 shadow-lg animate-scale-in motion-reduce:animate-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="suspend-dialog-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-3">
                <ShieldAlert className="h-8 w-8 shrink-0 text-warning" aria-hidden />
                <div>
                  <h2 id="suspend-dialog-title" className="text-lg font-semibold">
                    {pendingSuspend.status === 'suspended' ? 'Reactivate account?' : 'Suspend account?'}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {pendingSuspend.email} — this updates <code className="rounded bg-muted px-1">account_status</code> and is
                    recorded in admin audit logs.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setPendingSuspend(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant={pendingSuspend.status === 'suspended' ? 'primary' : 'outline'}
                      className={
                        pendingSuspend.status === 'suspended'
                          ? 'transition-transform duration-200 hover:scale-[1.02]'
                          : 'border-destructive text-destructive transition-transform duration-200 hover:scale-[1.02] hover:bg-destructive/10'
                      }
                      disabled={patch.isPending}
                      onClick={() => confirmSuspendToggle(pendingSuspend)}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {detailUser ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center animate-fade-in motion-reduce:animate-none"
            role="presentation"
            onClick={() => setDetailUser(null)}
          >
            <Card
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto p-6 shadow-lg animate-slide-in-right motion-reduce:animate-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-detail-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <UserRound className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h2 id="user-detail-title" className="truncate text-lg font-semibold">
                    {detailUser.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">User ID</dt>
                      <dd className="truncate font-mono text-xs">{detailUser.id}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Role</dt>
                      <dd>{detailUser.role}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="capitalize">{detailUser.status}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd>{detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleString() : '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Last login</dt>
                      <dd>{detailUser.lastLogin ? new Date(detailUser.lastLogin).toLocaleString() : '—'}</dd>
                    </div>
                  </dl>
                  <Button type="button" variant="secondary" className="mt-6 w-full" onClick={() => setDetailUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/admin" className="text-primary hover:underline">
            ← Admin overview
          </Link>
        </p>
    </div>
  )
}
