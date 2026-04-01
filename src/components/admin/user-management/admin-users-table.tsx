import { Activity, ArrowDown, ArrowUp, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { AdminUserRow } from '@/types/admin'

const ROLE_OPTIONS = ['founder', 'consultant', 'investor', 'other', 'admin'] as const

export type AdminUserSortKey = 'email' | 'createdAt' | 'lastLogin' | 'role'

interface AdminUsersTableProps {
  rows: AdminUserRow[]
  sortKey: AdminUserSortKey
  sortDir: 'asc' | 'desc'
  onToggleSort: (key: AdminUserSortKey) => void
  page: number
  totalPages: number
  total: number
  onPagePrev: () => void
  onPageNext: () => void
  patchPending: boolean
  onRoleChange: (u: AdminUserRow, role: string) => void
  onOpenDetail: (u: AdminUserRow) => void
  onToggleSuspend: (u: AdminUserRow) => void
  onImpersonate: (u: AdminUserRow) => void
}

function shortId(id: string): string {
  if (id.length <= 10) return id
  return `${id.slice(0, 8)}…`
}

export function AdminUsersTable({
  rows,
  sortKey,
  sortDir,
  onToggleSort,
  page,
  totalPages,
  total,
  onPagePrev,
  onPageNext,
  patchPending,
  onRoleChange,
  onOpenDetail,
  onToggleSuspend,
  onImpersonate,
}: AdminUsersTableProps) {
  const SortBtn = ({ col, label }: { col: AdminUserSortKey; label: string }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => onToggleSort(col)}
    >
      {label}
      {sortKey === col ? sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
    </button>
  )

  return (
    <Card className="surface-card overflow-hidden border-border/80 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                User ID
              </th>
              <th scope="col" className="px-3 py-3">
                <SortBtn col="email" label="Email / name" />
              </th>
              <th scope="col" className="px-3 py-3">
                <SortBtn col="role" label="Role" />
              </th>
              <th scope="col" className="px-3 py-3">
                Status
              </th>
              <th scope="col" className="px-3 py-3">
                <SortBtn col="lastLogin" label="Last active" />
              </th>
              <th scope="col" className="px-3 py-3">
                <SortBtn col="createdAt" label="Created" />
              </th>
              <th scope="col" className="px-3 py-3">
                Companies
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No users match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const companies = Array.isArray(u.linkedCompanies) ? u.linkedCompanies : []
                const lastTs = u.lastActiveAt || u.lastLogin
                const isAdminTarget = u.role === 'admin'
                return (
                  <tr
                    key={u.id}
                    className="transition-colors duration-150 hover:bg-muted/40 motion-reduce:transition-none"
                  >
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground" title={u.id}>
                      {shortId(u.id)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => onOpenDetail(u)}
                      >
                        {u.email || u.name}
                      </button>
                      <p className="text-xs text-muted-foreground">{u.name}</p>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="h-9 max-w-[140px] rounded-lg border border-input bg-background px-2 text-xs"
                        value={u.role}
                        onChange={(e) => onRoleChange(u, e.target.value)}
                        disabled={patchPending}
                        aria-label={`Role for ${u.email}`}
                      >
                        {(ROLE_OPTIONS ?? []).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={u.status === 'suspended' ? 'destructive' : 'success'}>{u.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {lastTs ? new Date(lastTs).toLocaleString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="max-w-[140px] px-3 py-3 text-xs text-muted-foreground">
                      <span className="line-clamp-2" title={(companies ?? []).join(', ')}>
                        {(companies ?? []).length === 0 ? '—' : (companies ?? []).slice(0, 3).join(', ')}
                        {(companies ?? []).length > 3 ? '…' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2 text-xs"
                          disabled={patchPending}
                          onClick={() => onOpenDetail(u)}
                          aria-label={`View activity and details for ${u.email || u.name}`}
                          title="Details & activity"
                        >
                          <Activity className="h-4 w-4" aria-hidden />
                        </Button>
                        <Switch
                          checked={u.status === 'suspended'}
                          onCheckedChange={() => onToggleSuspend(u)}
                          disabled={patchPending}
                          aria-label={u.status === 'suspended' ? 'Unsuspend user' : 'Suspend user'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2 text-xs"
                          disabled={patchPending || isAdminTarget}
                          onClick={() => onImpersonate(u)}
                          aria-label={`Impersonate ${u.email}`}
                          title={isAdminTarget ? 'Cannot impersonate admins' : 'Impersonate (support)'}
                        >
                          <UserCog className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Page {page} of {totalPages} · {total} users
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="h-9 px-3 text-xs" disabled={page <= 1} onClick={onPagePrev}>
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 text-xs"
            disabled={page >= totalPages}
            onClick={onPageNext}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}

export { AdminUsersTable as UserTable }
