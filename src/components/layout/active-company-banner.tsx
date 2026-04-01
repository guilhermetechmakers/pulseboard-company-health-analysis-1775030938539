import { Link } from 'react-router-dom'
import { Building2, Info } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useActiveCompany } from '@/contexts/active-company-context'
import { cn } from '@/lib/utils'

/**
 * Always-visible reminder of single-company mode for signed-in users (collapsible on small screens via line clamp).
 */
export function ActiveCompanyBanner() {
  const { session } = useAuth()
  const { company, companyId, isSingleCompanyModeEnabled, isLoading } = useActiveCompany()

  if (!session || !isSingleCompanyModeEnabled || isLoading) {
    return null
  }

  const label = company?.name?.trim() || (companyId ? 'Active company' : 'No company yet')

  return (
    <div
      className={cn(
        'border-t border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground',
        'motion-reduce:transition-none',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <span className="max-w-[220px] truncate sm:max-w-md">{label}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-prose">
            Single-company mode: one active workspace per account.{' '}
            {companyId ? (
              <>
                <Link to="/company" className="font-medium text-primary underline-offset-2 hover:underline">
                  Company workspace
                </Link>{' '}
                ·{' '}
                <Link to="/settings" className="font-medium text-primary underline-offset-2 hover:underline">
                  Integrations
                </Link>
              </>
            ) : (
              <>
                <Link to="/company/create" className="font-medium text-primary underline-offset-2 hover:underline">
                  Create a company
                </Link>{' '}
                to unlock the dashboard and analysis flows.
              </>
            )}
          </span>
        </span>
      </div>
    </div>
  )
}
