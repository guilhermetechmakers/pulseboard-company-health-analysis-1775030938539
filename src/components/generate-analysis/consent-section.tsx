import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ConsentSectionProps {
  consent: boolean
  onConsentChange: (v: boolean) => void
  disabled?: boolean
  className?: string
}

export function ConsentSection({ consent, onConsentChange, disabled, className }: ConsentSectionProps) {
  return (
    <div className={cn('rounded-xl border border-border p-4 transition-colors duration-200 hover:bg-muted/30', className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id="ai-consent"
          checked={consent}
          disabled={disabled}
          onCheckedChange={(c) => onConsentChange(c === true)}
          className="mt-1"
          aria-describedby="ai-consent-desc"
        />
        <div className="space-y-1">
          <Label htmlFor="ai-consent" className="cursor-pointer text-base font-medium leading-snug">
            Consent to AI processing
          </Label>
          <p id="ai-consent-desc" className="text-sm text-muted-foreground">
            Required. Your structured company context is sent to the LLM to produce this report. Do not include secrets you
            cannot share. See{' '}
            <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
              terms &amp; privacy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
