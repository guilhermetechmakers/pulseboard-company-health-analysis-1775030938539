import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useActiveCompany } from '@/contexts/active-company-context'

/**
 * Remediation surface when a scoped action is rejected (e.g. mismatched `X-Active-Company-Id`).
 * Linked from toasts or deep links; keeps copy actionable per single-company policy.
 */
export function SingleCompanyBlockedPage() {
  const [params] = useSearchParams()
  const reason = params.get('reason') ?? 'scope'
  const { companyId, companyName } = useActiveCompany()

  return (
    <section className="mx-auto max-w-lg space-y-6 py-8 animate-fade-in motion-reduce:animate-none">
      <Card className="border-[rgb(220,38,38)]/25 bg-card p-8 shadow-card">
        <div className="flex gap-3">
          <AlertTriangle className="h-8 w-8 shrink-0 text-[rgb(220,38,38)]" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Action blocked</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {reason === 'report'
                ? 'This report is not part of your active company workspace. PulseBoard runs in single-company mode so scores, integrations, and exports stay aligned.'
                : reason === 'cross_company'
                  ? 'That resource belongs to a different company context. PulseBoard keeps each account on one active company so scores, reports, and integrations stay consistent.'
                  : 'This workspace action is not available in your current company context.'}
            </p>
            {companyId ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Active company: <span className="font-medium text-foreground">{companyName ?? companyId}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" variant="primary" className="transition-transform duration-200 hover:scale-[1.02]" asChild>
            <Link to="/company">Open company workspace</Link>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/settings">Company settings & integrations</Link>
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          If you recently merged companies or need a different primary workspace, ask a platform admin to run consolidation
          or set your primary company in the admin console.
        </p>
      </Card>
    </section>
  )
}
