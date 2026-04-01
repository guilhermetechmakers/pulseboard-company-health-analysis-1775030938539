import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface EmailPreviewCardProps {
  subject: string
  previewText: string
  className?: string
  sentAtLabel?: string
}

export function EmailPreviewCard({ subject, previewText, className, sentAtLabel }: EmailPreviewCardProps) {
  return (
    <Card
      className={cn(
        'border-border/80 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-card',
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email preview</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{subject}</p>
      {sentAtLabel ? <p className="mt-1 text-xs text-muted-foreground">{sentAtLabel}</p> : null}
      <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{previewText}</p>
    </Card>
  )
}
