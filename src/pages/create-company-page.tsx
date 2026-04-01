import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OnboardingWizard } from '@/components/company/onboarding-wizard'
import { useMyCompany } from '@/hooks/use-my-company'
import { logCompanyTelemetryEvent } from '@/api/companies'

export function CreateCompanyPage() {
  const { data: company, isLoading } = useMyCompany()
  const loggedBlockRef = useRef(false)

  useEffect(() => {
    if (!company?.id || loggedBlockRef.current) return
    loggedBlockRef.current = true
    void logCompanyTelemetryEvent('second_company_attempt_blocked', { companyId: company.id })
  }, [company?.id])

  if (isLoading) {
    return (
      <section className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full max-w-3xl" />
      </section>
    )
  }

  if (company) {
    return (
      <section className="mx-auto max-w-2xl space-y-6 animate-fade-in motion-reduce:animate-none">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Company already on file</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            PulseBoard uses a single active company per account. Edit your workspace, manage integrations, or contact
            support if you need admin consolidation for legacy duplicates.
          </p>
        </div>
        <Card className="border-border/80 p-8 shadow-card">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-8 w-8 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">{company.name}</p>
                <p className="text-sm text-muted-foreground">
                  {company.industry ? `${company.industry}` : 'Industry not set'}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="primary"
                className="min-h-[44px] gap-2 transition-transform duration-200 hover:scale-[1.02]"
                asChild
              >
                <Link to="/company">
                  <Pencil className="h-4 w-4" aria-hidden />
                  Open company workspace
                </Link>
              </Button>
              <Button type="button" variant="secondary" className="min-h-[44px]" asChild>
                <Link to="/settings">Integrations & settings</Link>
              </Button>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Attempting to create another company returns a 409 conflict — use the workspace to update profile,
            financials, market, and social data instead.
          </p>
        </Card>
      </section>
    )
  }

  return (
    <section>
      <OnboardingWizard />
    </section>
  )
}
