import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminUserDetailQuery } from '@/hooks/use-admin-users'
import type { AdminUserRow } from '@/types/admin'

interface UserDetailModalProps {
  summaryUser: AdminUserRow | null
  open: boolean
  onClose: () => void
}

export function UserDetailModal({ summaryUser, open, onClose }: UserDetailModalProps) {
  const userId = open && summaryUser ? summaryUser.id : null
  const detailQ = useAdminUserDetailQuery(userId, open)

  if (!open || !summaryUser) return null

  const detail = detailQ.data
  const user = detail?.user
  const activity = Array.isArray(detail?.activity) ? detail.activity : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center animate-fade-in motion-reduce:animate-none"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
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
              {user?.name ?? summaryUser.name}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email ?? summaryUser.email}</p>

            {detailQ.isLoading ? (
              <div className="mt-4 space-y-2" aria-busy="true">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : detailQ.isError ? (
              <p className="mt-4 text-sm text-destructive">Could not load full profile.</p>
            ) : (
              <>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">User ID</dt>
                    <dd className="truncate font-mono text-xs">{user?.id ?? summaryUser.id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Roles</dt>
                    <dd>{(user?.roles ?? summaryUser.roles ?? [summaryUser.role]).join(', ')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="capitalize">{user?.status ?? summaryUser.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleString()
                        : summaryUser.createdAt
                          ? new Date(summaryUser.createdAt).toLocaleString()
                          : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Last login</dt>
                    <dd>
                      {user?.lastLogin
                        ? new Date(user.lastLogin).toLocaleString()
                        : summaryUser.lastLogin
                          ? new Date(summaryUser.lastLogin).toLocaleString()
                          : '—'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked companies</h3>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm">
                    {(user?.linkedCompanies ?? []).length === 0 ? (
                      <li className="text-muted-foreground">No companies linked.</li>
                    ) : (
                      (user?.linkedCompanies ?? []).map((c) => (
                        <li key={`${c.id}-${c.via}`} className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0">
                          <span className="truncate">{c.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{c.via}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h3>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs">
                    {activity.length === 0 ? (
                      <li className="text-muted-foreground">No activity rows.</li>
                    ) : (
                      activity.map((a) => (
                        <li key={a.id} className="rounded-md border border-border/50 bg-muted/30 px-2 py-1.5">
                          <span className="font-medium text-foreground">{a.action}</span>
                          <span className="mt-0.5 block text-muted-foreground">
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </>
            )}
            <Button type="button" variant="secondary" className="mt-6 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
