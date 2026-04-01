import { Link } from 'react-router-dom'
import { Lightbulb, ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CompletenessSlice } from '@/lib/dashboard-utils'
import type { DashboardReportSnippet } from '@/types/dashboard'
import type { ReportRow } from '@/types/analysis'

export interface TipsWidgetProps {
  completenessSlices: CompletenessSlice[]
  latestReport: (DashboardReportSnippet | ReportRow) | null
  className?: string
}

function tipsFromActionPlan(plan: unknown): string[] {
  if (!Array.isArray(plan)) return []
  const out: string[] = []
  for (const item of plan.slice(0, 5)) {
    if (typeof item === 'string') {
      out.push(item)
      continue
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>
      const title = o.title
      const action = o.action
      if (typeof title === 'string') out.push(title)
      else if (typeof action === 'string') out.push(action)
    }
  }
  return out
}

function tipsFromRisks(risks: unknown): string[] {
  if (!Array.isArray(risks)) return []
  const out: string[] = []
  for (const r of risks.slice(0, 3)) {
    if (typeof r === 'string') out.push(`Risk: ${r}`)
    else if (r && typeof r === 'object' && !Array.isArray(r)) {
      const label = (r as Record<string, unknown>).title ?? (r as Record<string, unknown>).description
      if (typeof label === 'string') out.push(`Risk: ${label}`)
    }
  }
  return out
}

export function TipsWidget({ completenessSlices, latestReport, className }: TipsWidgetProps) {
  const slices = Array.isArray(completenessSlices) ? completenessSlices : []
  const missing = slices.filter((s) => !s.done)

  const aiTips = [
    ...tipsFromActionPlan(latestReport?.action_plan),
    ...tipsFromRisks(latestReport?.risks),
  ]

  const prioritized: { text: string; href: string }[] = []

  for (const m of missing.slice(0, 4)) {
    prioritized.push({ text: `Complete ${m.label}`, href: m.href })
  }
  for (const t of aiTips.slice(0, 4)) {
    if (prioritized.length >= 6) break
    prioritized.push({ text: t, href: '/generate' })
  }

  if (prioritized.length === 0) {
    prioritized.push({ text: 'Run a fresh analysis to refresh recommendations.', href: '/generate' })
  }

  return (
    <Card className={cn('border-[rgb(245,158,11)]/25 bg-[rgb(245,158,11)]/[0.06] p-6 shadow-sm', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-[rgb(245,158,11)]" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">Tips &amp; next steps</h2>
      </div>
      <ul className="space-y-2" aria-label="Prioritized next steps">
        {prioritized.map((p, i) => (
          <li key={`${p.href}-${i}`} className="flex gap-2 text-sm">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(22,163,74)]" aria-hidden />
            <Link
              to={p.href}
              className="text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {p.text}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
