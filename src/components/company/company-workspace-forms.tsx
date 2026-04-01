import type { CompanyRow } from '@/types/integrations'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { ProfileWorkspaceForm } from '@/components/company/forms/profile-workspace-form'
import { FinancialsForm } from '@/components/company/forms/financials-form'
import { MarketDataForm } from '@/components/company/forms/market-data-form'
import { SocialBrandForm } from '@/components/company/forms/social-brand-form'

type FinancialsRow = Database['public']['Tables']['company_financials']['Row']
type MarketRow = Database['public']['Tables']['company_market_data']['Row']
type SocialRow = Database['public']['Tables']['company_social']['Row']

export interface CompanyWorkspaceFormsProps {
  companyId: string
  company: CompanyRow
  financials: FinancialsRow | null
  market: MarketRow | null
  social: SocialRow | null
  className?: string
}

export function CompanyWorkspaceForms({
  companyId,
  company,
  financials,
  market,
  social,
  className,
}: CompanyWorkspaceFormsProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <ProfileWorkspaceForm companyId={companyId} company={company} />
      <FinancialsForm companyId={companyId} financials={financials} />
      <MarketDataForm companyId={companyId} market={market} />
      <SocialBrandForm companyId={companyId} social={social} />
    </div>
  )
}
