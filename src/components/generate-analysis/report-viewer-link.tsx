import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ReportViewerLinkProps {
  reportId: string
  className?: string
}

export function ReportViewerLink({ reportId, className }: ReportViewerLinkProps) {
  const id = typeof reportId === 'string' && reportId.length > 0 ? reportId : ''
  if (!id) return null
  return (
    <Button
      asChild
      variant="primary"
      className={cn('min-h-[44px] gap-2 transition-transform duration-200 hover:scale-[1.02]', className)}
    >
      <Link to={`/report/${id}`}>
        <FileText className="h-4 w-4" aria-hidden />
        Open full report
      </Link>
    </Button>
  )
}
