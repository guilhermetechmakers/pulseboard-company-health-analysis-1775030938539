import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ExternalLink, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BillingOverviewCard } from '@/components/auth/billing-overview-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { settingsBillingSummary } from '@/api/settings'
import { useBillingReceipts } from '@/hooks/use-settings-module'
import { useUserSubscription } from '@/hooks/use-auth-profile'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export interface BillingPanelProps {
  userId: string | undefined
  companyId: string | undefined
}

function formatReceiptDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function BillingPanel({ userId, companyId }: BillingPanelProps) {
  const { data: subscription, isLoading: subLoading } = useUserSubscription(userId)
  const { data: receipts = [], isLoading: recLoading } = useBillingReceipts(userId)

  const portalQuery = useQuery({
    queryKey: ['settings', 'billing-portal', companyId],
    enabled: Boolean(supabase && companyId),
    queryFn: () => settingsBillingSummary(companyId as string),
  })

  const portalUrl =
    portalQuery.data?.paymentsPortalUrl ??
    (typeof import.meta.env.VITE_PAYMENTS_PORTAL_URL === 'string' ? import.meta.env.VITE_PAYMENTS_PORTAL_URL : null)

  const safeReceipts = Array.isArray(receipts) ? receipts : []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BillingOverviewCard subscription={subscription ?? null} isLoading={subLoading} />

      <Card className="space-y-4 p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Payments & receipts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {portalQuery.data?.receiptsNote ??
              'Open your billing provider to manage cards, invoices, and tax documents. Tokens never appear in the UI.'}
          </p>
        </div>
        {portalUrl ? (
          <Button asChild variant="primary" className="min-h-[44px] w-full gap-2 sm:w-auto">
            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open payment portal
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1">VITE_PAYMENTS_PORTAL_URL</code> or deploy{' '}
            <code className="rounded bg-muted px-1">pulse-settings-api</code> with{' '}
            <code className="rounded bg-muted px-1">PULSEBOARD_BILLING_PORTAL_URL</code> for a direct link.
          </p>
        )}

        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Recent receipts</h3>
          </div>
          {recLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (safeReceipts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts stored yet. They appear here after billing sync.</p>
          ) : (
            <ul className="space-y-2" aria-label="Billing receipts">
              {(safeReceipts ?? []).map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2',
                    'transition-colors hover:bg-muted/40',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatReceiptDate(r.issued_at)}
                      {typeof r.amount_cents === 'number' ? ` · ${(r.amount_cents / 100).toFixed(2)} ${r.currency}` : ''}
                    </p>
                  </div>
                  {r.external_url ? (
                    <Button asChild variant="ghost" className="h-8 shrink-0 px-3 py-1 text-xs">
                      <a href={r.external_url} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/profile">Security & MFA on profile</Link>
        </Button>
      </Card>
    </div>
  )
}
