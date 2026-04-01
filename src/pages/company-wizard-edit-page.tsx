import { Navigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { OnboardingWizard } from '@/components/company/onboarding-wizard'
import { useMyCompany } from '@/hooks/use-my-company'

export function CompanyWizardEditPage() {
  const { data: company, isLoading } = useMyCompany()

  if (isLoading) {
    return (
      <section className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full max-w-3xl" />
      </section>
    )
  }

  if (!company?.id) {
    return <Navigate to="/company/create" replace />
  }

  return (
    <section>
      <OnboardingWizard mode="edit" />
    </section>
  )
}
