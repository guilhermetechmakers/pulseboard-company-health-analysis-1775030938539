import { CalendarDays, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']

interface BillingOverviewCardProps {
  subscription: SubscriptionRow | null | undefined
  isLoading?: boolean
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return format(new Date(value), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function BillingOverviewCard({ subscription, isLoading }: BillingOverviewCardProps) {
  if (isLoading) {
    return (
      <Card className="surface-card animate-pulse p-4">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="mt-4 h-4 w-full rounded bg-muted" />
      </Card>
    )
  }

  const sub = subscription ?? null
  const planId = sub?.plan_id ?? 'starter_plan'
  const status = sub?.status ?? 'trialing'

  return (
    <Card className="surface-card relative overflow-hidden p-4 animate-fade-in motion-reduce:animate-none">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/10" aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle className="text-base">Billing & plan</CardTitle>
        </div>
        <Badge variant="outline" className="border-primary/30 capitalize">
          {status.replace(/_/g, ' ')}
        </Badge>
      </div>
      <dl className="relative mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium text-foreground">{planId.replace(/_/g, ' ')}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden />
            Next billing
          </dt>
          <dd className="font-medium">{formatDate(sub?.next_billing_date)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Current period ends</dt>
          <dd className="font-medium">{formatDate(sub?.current_period_end)}</dd>
        </div>
      </dl>
      <p className="relative mt-3 text-xs text-muted-foreground">Upgrade or invoices will connect to your payment provider when billing is enabled.</p>
    </Card>
  )
}
