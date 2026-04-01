import { format, parseISO } from 'date-fns'
import { Activity, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CompanyRow } from '@/types/integrations'

export interface CompanyHeaderCardProps {
  company: CompanyRow
  overallScore: number | null
  lastAnalysisAt: string | null
  revenue: number | null
  profit: number | null
  cash: number | null
  className?: string
}

function fmtMoney(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return iso.slice(0, 10)
  }
}

export function CompanyHeaderCard({
  company,
  overallScore,
  lastAnalysisAt,
  revenue,
  profit,
  cash,
  className,
}: CompanyHeaderCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-card transition-shadow duration-300 hover:shadow-lg motion-reduce:transition-none',
        className,
      )}
    >
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl motion-reduce:opacity-0" aria-hidden />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active company</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h2>
          <p className="text-sm text-muted-foreground">
            {company.industry ? <span>{company.industry}</span> : <span>Industry not set</span>}
            {company.website ? (
              <>
                {' '}
                ·{' '}
                <span className="text-primary">{company.website}</span>
              </>
            ) : null}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden />
            Last analysis: <span className="font-medium text-foreground">{fmtDate(lastAnalysisAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[120px] rounded-xl border border-border bg-background/80 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Health</p>
            <div className="mt-1 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[rgb(22,163,74)]" aria-hidden />
              <span className="text-3xl font-semibold text-primary">
                {overallScore !== null && Number.isFinite(overallScore) ? Math.round(overallScore) : '—'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border bg-background/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Revenue</p>
              <p className="text-sm font-semibold text-foreground">{fmtMoney(revenue)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Profit</p>
              <p className="text-sm font-semibold text-foreground">{fmtMoney(profit)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cash</p>
              <p className="text-sm font-semibold text-foreground">{fmtMoney(cash)}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
