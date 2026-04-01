import { format, parseISO } from 'date-fns'
import { Building2, Globe, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CompanyRow } from '@/types/integrations'

export interface ProfileSummaryCardProps {
  company: CompanyRow
  className?: string
}

export function ProfileSummaryCard({ company, className }: ProfileSummaryCardProps) {
  const updated = company.updated_at
  let updatedLabel = '—'
  try {
    if (updated) updatedLabel = format(parseISO(updated), 'MMM d, yyyy h:mm a')
  } catch {
    updatedLabel = updated ?? '—'
  }

  const href =
    company.website && company.website.length > 0
      ? company.website.startsWith('http')
        ? company.website
        : `https://${company.website}`
      : null

  return (
    <Card
      className={cn(
        'border-border/80 p-6 shadow-card transition-shadow duration-200 hover:shadow-lg',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{company.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[company.industry, company.stage].filter(Boolean).join(' · ') || 'Add industry and stage for stronger scoring.'}
            </p>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Globe className="h-4 w-4 shrink-0" aria-hidden />
                {company.website}
              </a>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:text-right">
          <span className="flex items-center gap-1.5 sm:justify-end">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Last updated
          </span>
          <time className="mt-1 block font-medium text-foreground" dateTime={updated ?? undefined}>
            {updatedLabel}
          </time>
        </div>
      </div>
      <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business model</p>
          <p className="mt-1 text-sm text-foreground">{company.business_model?.trim() || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Products / services</p>
          <p className="mt-1 text-sm text-foreground">{company.products?.trim() || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target customer</p>
          <p className="mt-1 text-sm text-foreground">{company.target_customer?.trim() || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goals</p>
          <p className="mt-1 text-sm text-foreground">{company.goals?.trim() || '—'}</p>
        </div>
      </div>
    </Card>
  )
}
