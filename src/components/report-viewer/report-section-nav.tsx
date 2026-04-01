import { cn } from '@/lib/utils'
import type { ReportViewerNavItem } from '@/types/report-viewer'

export interface ReportSectionNavProps {
  items: ReportViewerNavItem[]
  className?: string
}

/**
 * Sticky left rail — scrolls to in-page section anchors.
 */
export function ReportSectionNav({ items, className }: ReportSectionNavProps) {
  const safe = Array.isArray(items) ? items : []

  const scrollTo = (id: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="Report sections"
      className={cn(
        'no-print sticky top-20 hidden h-fit w-52 shrink-0 flex-col gap-1 rounded-xl border border-border/80 bg-card/95 p-3 shadow-card backdrop-blur-sm lg:flex',
        className,
      )}
    >
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
      <ul className="space-y-0.5">
        {safe.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => scrollTo(item.id)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-200',
                'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'motion-reduce:transition-none',
              )}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
