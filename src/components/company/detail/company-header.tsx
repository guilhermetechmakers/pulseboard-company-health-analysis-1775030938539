import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Pencil, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProfileQuickEditForm } from '@/components/company/forms/profile-quick-edit-form'
import type { CompanyRow } from '@/types/integrations'
import { cn } from '@/lib/utils'

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `${Number(n).toFixed(1)}%`
}

export interface CompanyHeaderProps {
  company: CompanyRow
  monthlyRevenue: number | null | undefined
  profitMarginPct: number | null | undefined
  cashBalance: number | null | undefined
  overallHealth: number | null | undefined
  className?: string
}

export function CompanyHeader({
  company,
  monthlyRevenue,
  profitMarginPct,
  cashBalance,
  overallHealth,
  className,
}: CompanyHeaderProps) {
  const [quickOpen, setQuickOpen] = useState(false)
  const overall = overallHealth != null && Number.isFinite(overallHealth) ? Math.round(overallHealth) : null

  return (
    <Card className={cn('overflow-hidden border-border/80 shadow-card', className)}>
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active company</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{company.name}</h2>
            <p className="text-sm text-muted-foreground">
              {[company.industry, company.stage].filter(Boolean).join(' · ') || 'Add industry and stage for stronger signals.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {overall != null ? (
              <div
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3"
                aria-label={`Overall health score ${overall} out of 100`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {overall}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-primary">Health</p>
                  <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-[rgb(22,163,74)]" aria-hidden />
                    Overall score
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Compute health to see an overall score.</p>
            )}
            <Button asChild variant="primary" className="min-h-[44px] gap-2 transition-transform duration-200 hover:scale-[1.02]">
              <Link to="/company/wizard/edit">
                <Pencil className="h-4 w-4" aria-hidden />
                Edit company (wizard)
              </Link>
            </Button>
          </div>
        </div>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-card/80 px-4 py-3">
            <dt className="text-xs font-medium text-muted-foreground">Monthly revenue</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{fmtMoney(monthlyRevenue)}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/80 px-4 py-3">
            <dt className="text-xs font-medium text-muted-foreground">Profit margin</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{fmtPct(profitMarginPct)}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/80 px-4 py-3">
            <dt className="text-xs font-medium text-muted-foreground">Cash balance</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{fmtMoney(cashBalance)}</dd>
          </div>
        </dl>
      </div>
      <div className="p-4 md:p-6">
        <Button
          type="button"
          variant="ghost"
          className="mb-3 min-h-[44px] w-full justify-between px-2 sm:w-auto"
          onClick={() => setQuickOpen((o) => !o)}
          aria-expanded={quickOpen}
        >
          <span className="font-medium">Inline quick edit</span>
          {quickOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </Button>
        {quickOpen ? <ProfileQuickEditForm companyId={company.id} company={company} onSaved={() => setQuickOpen(false)} /> : null}
      </div>
    </Card>
  )
}
