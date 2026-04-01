import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FinancialsForm } from '@/components/company/forms/financials-form'
import { MarketDataForm } from '@/components/company/forms/market-data-form'
import { SocialBrandForm } from '@/components/company/forms/social-brand-form'
import { useMyCompany } from '@/hooks/use-my-company'
import { useCompanyAggregates } from '@/hooks/use-company-aggregates'

function WorkspaceBackLink() {
  return (
    <Button asChild variant="ghost" className="min-h-[44px] px-0 text-primary">
      <Link to="/company">← Back to company workspace</Link>
    </Button>
  )
}

export function FinancialsPage() {
  const { data: company, isLoading: cLoading } = useMyCompany()
  const companyId = company?.id
  const { data: agg, isLoading: aLoading } = useCompanyAggregates(companyId)

  if (cLoading || aLoading || !companyId) {
    return (
      <section className="space-y-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </section>
    )
  }

  return (
    <section className="space-y-6 animate-fade-in-up motion-reduce:animate-none">
      <div>
        <WorkspaceBackLink />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Financials</h1>
        <p className="mt-1 text-muted-foreground">
          Revenue, expenses, margin, cash, and debt — used by the health scoring engine and AI analysis.
        </p>
      </div>
      <FinancialsForm companyId={companyId} financials={agg?.financials ?? null} />
    </section>
  )
}

export function MarketDataPage() {
  const { data: company, isLoading: cLoading } = useMyCompany()
  const companyId = company?.id
  const { data: agg, isLoading: aLoading } = useCompanyAggregates(companyId)

  if (cLoading || aLoading || !companyId) {
    return (
      <section className="space-y-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </section>
    )
  }

  return (
    <section className="space-y-6 animate-fade-in-up motion-reduce:animate-none">
      <div>
        <WorkspaceBackLink />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Market data</h1>
        <p className="mt-1 text-muted-foreground">Competitors and trends that inform SWOT and market analysis.</p>
      </div>
      <MarketDataForm companyId={companyId} market={agg?.market ?? null} />
    </section>
  )
}

export function SocialBrandPage() {
  const { data: company, isLoading: cLoading } = useMyCompany()
  const companyId = company?.id
  const { data: agg, isLoading: aLoading } = useCompanyAggregates(companyId)

  if (cLoading || aLoading || !companyId) {
    return (
      <section className="space-y-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </section>
    )
  }

  return (
    <section className="space-y-6 animate-fade-in-up motion-reduce:animate-none">
      <div>
        <WorkspaceBackLink />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Social &amp; brand</h1>
        <p className="mt-1 text-muted-foreground">Channel metrics, engagement, and traffic inputs for brand scoring.</p>
      </div>
      <SocialBrandForm companyId={companyId} social={agg?.social ?? null} />
    </section>
  )
}
