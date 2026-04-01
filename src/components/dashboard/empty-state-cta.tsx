import { Link } from 'react-router-dom'
import { Building2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface EmptyStateCtaProps {
  className?: string
}

export function EmptyStateCta({ className }: EmptyStateCtaProps) {
  return (
    <Card
      className={`border-primary/20 bg-card/95 p-8 text-center shadow-card backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg motion-reduce:transition-none ${className ?? ''}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Set up your company</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        PulseBoard needs a company profile to score health, run AI analysis, and sync connectors. Complete the guided
        wizard to unlock your dashboard.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          asChild
          variant="primary"
          className="min-h-11 min-w-[200px] gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100"
        >
          <Link to="/company/create">
            <Sparkles className="h-4 w-4" aria-hidden />
            Start company wizard
          </Link>
        </Button>
        <Button asChild variant="secondary" className="min-h-11">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </Card>
  )
}
