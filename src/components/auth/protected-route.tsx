import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, isLoading, isConfigured } = useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <Card className="surface-card p-6">
        <p className="text-sm text-muted-foreground">
          Supabase is not configured. Set <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> to enable authentication.
        </p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading session">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!session) {
    const returnPath = `${location.pathname}${location.search ?? ''}`
    if (returnPath && returnPath !== '/login') {
      try {
        sessionStorage.setItem('pulseboard_auth_return', returnPath)
      } catch {
        /* ignore quota / private mode */
      }
    }
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
