import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { useActiveCompany } from '@/contexts/active-company-context'
import { Skeleton } from '@/components/ui/skeleton'

interface RequireCompanyRouteProps {
  children: ReactNode
}

function pathSkipsCompanyGate(pathname: string): boolean {
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return true
  if (pathname.startsWith('/company/create')) return true
  if (pathname.startsWith('/company/scope-notice')) return true
  if (pathname.startsWith('/profile')) return true
  if (pathname.startsWith('/notifications')) return true
  if (pathname.startsWith('/admin')) return true
  if (pathname.startsWith('/verify-email')) return true
  if (pathname.startsWith('/password-reset')) return true
  return false
}

/**
 * Single-company workspace gate: authenticated users without a `companies` row are sent to onboarding.
 * `VITE_SINGLE_COMPANY_MODE=false` disables the redirect for exceptional rollouts.
 *
 * Rationale: dashboards, reports, integrations, and AI jobs must not run without an active company scope.
 */
export function RequireCompanyRoute({ children }: RequireCompanyRouteProps) {
  const { session, isLoading: authLoading, isConfigured } = useAuth()
  const { companyId, isLoading: companyLoading, isSingleCompanyModeEnabled } = useActiveCompany()
  const location = useLocation()

  const singleCompanyEnvOff = import.meta.env.VITE_SINGLE_COMPANY_MODE === 'false'

  if (!isConfigured) {
    return <>{children}</>
  }

  if (authLoading || (session && companyLoading)) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading company context">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!session) {
    return <>{children}</>
  }

  if (pathSkipsCompanyGate(location.pathname)) {
    return <>{children}</>
  }

  if (singleCompanyEnvOff || !isSingleCompanyModeEnabled) {
    return <>{children}</>
  }

  if (!companyId) {
    return (
      <Navigate
        to="/company/create"
        replace
        state={{ from: location.pathname, reason: 'no_active_company' }}
      />
    )
  }

  return <>{children}</>
}
