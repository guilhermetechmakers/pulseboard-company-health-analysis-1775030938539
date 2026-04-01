import { Link } from 'react-router-dom'
import { LayoutDashboard, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { notificationPrefsQueryKey } from '@/hooks/use-notifications'

export interface DashboardLinkBridgeProps {
  companyId: string
}

export function DashboardLinkBridge({ companyId }: DashboardLinkBridgeProps) {
  const qc = useQueryClient()

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-card transition-transform duration-200 hover:shadow-md motion-reduce:transition-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Dashboard sync</h2>
            <p className="text-sm text-muted-foreground">
              Integration status and notification preferences refresh when you open the dashboard. Use refresh after
              changing settings.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="gap-2" asChild>
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
          <Button
            type="button"
            variant="primary"
            className="gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
            onClick={() => {
              void qc.invalidateQueries({ queryKey: ['integrations', companyId] })
              void qc.invalidateQueries({ queryKey: ['sync-jobs', companyId] })
              void qc.invalidateQueries({ queryKey: notificationPrefsQueryKey })
              void qc.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh workspace caches
          </Button>
        </div>
      </div>
    </Card>
  )
}
