import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface StartAnalysisButtonProps {
  disabled: boolean
  isLoading: boolean
  onClick: () => void
  className?: string
}

export function StartAnalysisButton({ disabled, isLoading, onClick, className }: StartAnalysisButtonProps) {
  return (
    <Button
      type="button"
      variant="primary"
      className={cn(
        'min-h-[44px] w-full gap-2 bg-primary shadow-card transition-transform duration-200 hover:scale-[1.02] hover:shadow-md sm:w-auto',
        className,
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
      {isLoading ? 'Starting…' : 'Start analysis'}
    </Button>
  )
}
