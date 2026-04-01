import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface AdminOnlyRouteProps {
  children: ReactNode
}

export function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { user, isConfigured } = useAuth()
  const userId = user?.id
  const { data: profile, isLoading, isError } = useUserProfile(userId)

  if (!isConfigured) {
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading admin access">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || profile?.role !== 'admin' || profile?.account_status === 'suspended') {
    return (
      <Card className="surface-card mx-auto max-w-lg p-8 text-center animate-fade-in motion-reduce:animate-none">
        <h1 className="mb-2 text-2xl font-semibold">Restricted</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This workspace is reserved for PulseBoard administrators. If you need access, contact your organization
          owner.
        </p>
        <Button asChild variant="secondary">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </Card>
    )
  }

  return <>{children}</>
}
