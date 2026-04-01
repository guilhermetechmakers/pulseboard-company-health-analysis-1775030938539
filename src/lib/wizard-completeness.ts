import type { OnboardingWizardData } from '@/types/company-wizard'

function normArr<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : []
}

function str(v: string | null | undefined): string {
  return (v ?? '').trim()
}

/**
 * Minimum thresholds before the wizard allows finishing onboarding.
 */
export function wizardMeetsMinimumThreshold(data: OnboardingWizardData): boolean {
  const s1 = str(data.step1.name)
  const s2i = str(data.step2.industry)
  const s2b = str(data.step2.business_model)
  const s2t = str(data.step2.target_customers)
  const products = normArr(data.step2.products_services).filter((x) => str(x).length > 0)
  const finAny = [data.step3.revenue, data.step3.expenses].some((x) => str(x).length > 0)
  const comps = normArr(data.step4.competitors).filter((c) => str(c?.name).length > 0)
  const trends = normArr(data.step4.trends).filter((t) => str(t).length > 0)
  const marketOk = comps.length > 0 || trends.length > 0 || str(data.step4.market_segments).length > 0
  const hasWebsiteOrTraffic =
    str(data.step1.website).length > 0 || str(data.step5.website_traffic).length > 0
  const ch = normArr(data.step5.channels).some((c) => str(c?.platform).length > 0)
  const socialOk = hasWebsiteOrTraffic || ch

  return (
    s1.length > 0 &&
    s2i.length > 0 &&
    s2b.length > 0 &&
    products.length > 0 &&
    s2t.length > 0 &&
    finAny &&
    marketOk &&
    socialOk
  )
}

export function wizardCompletenessPercent(data: OnboardingWizardData): number {
  const checks: boolean[] = [
    str(data.step1.name).length > 0,
    str(data.step2.industry).length > 0 && str(data.step2.business_model).length > 0,
    normArr(data.step2.products_services).some((x) => str(x).length > 0),
    str(data.step2.target_customers).length > 0,
    [data.step3.revenue, data.step3.expenses, data.step3.cash].some((x) => str(x).length > 0),
    normArr(data.step4.competitors).some((c) => str(c?.name).length > 0) ||
      normArr(data.step4.trends).length > 0,
    str(data.step1.website).length > 0 ||
      normArr(data.step5.channels).some((c) => str(c?.platform).length > 0),
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}
