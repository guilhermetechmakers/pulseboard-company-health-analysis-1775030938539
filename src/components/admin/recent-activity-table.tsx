import { Card } from '@/components/ui/card'
import type { AdminRecentActivityItem } from '@/types/admin'

export interface RecentActivityTableProps {
  items: AdminRecentActivityItem[]
}

export function RecentActivityTable({ items }: RecentActivityTableProps) {
  const rows = Array.isArray(items) ? items : []

  return (
    <Card className="surface-card overflow-hidden border-border/80 shadow-card">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">Recent admin activity</h2>
        <p className="text-xs text-muted-foreground">Role changes, suspensions, and exports (audit trail).</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Time
              </th>
              <th scope="col" className="px-4 py-3">
                Action
              </th>
              <th scope="col" className="px-4 py-3">
                Admin
              </th>
              <th scope="col" className="px-4 py-3">
                Target user
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No admin actions recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition-colors duration-150 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                    {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-foreground">{row.action}</td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.adminId || '—'}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.targetUserId || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
