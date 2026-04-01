import { GlobalSearchBar } from '@/components/search/global-search-bar'
import { searchI18n } from '@/lib/search-i18n'
import { cn } from '@/lib/utils'

export interface DashboardSearchBarProps {
  className?: string
  /** Shown in header row on dashboard when duplicating search affordance */
  placeholder?: string
}

/** In-page search with autosuggest (same pipeline as global header). */
export function DashboardSearchBar({ className, placeholder }: DashboardSearchBarProps) {
  return (
    <div className={cn('w-full max-w-md', className)}>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Search reports &amp; workspace</p>
      <GlobalSearchBar
        placeholder={placeholder ?? searchI18n.globalPlaceholder}
        className="w-full max-w-none flex-1"
      />
    </div>
  )
}
