import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmailVerificationBannerProps {
  email?: string | null
  isVerified: boolean
  onResend?: () => void
  isResending?: boolean
  cooldownSeconds?: number
  className?: string
}

export function EmailVerificationBanner({
  email,
  isVerified,
  onResend,
  isResending,
  cooldownSeconds = 0,
  className,
}: EmailVerificationBannerProps) {
  if (isVerified) return null

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-medium">Verify your email</p>
          <p className="text-muted-foreground">
            {email ? `We sent a link to ${email}.` : 'Check your inbox for the verification link.'} Some features stay limited until you
            confirm.
          </p>
        </div>
      </div>
      {onResend ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isResending || cooldownSeconds > 0}
          onClick={onResend}
          className="h-9 shrink-0 px-3 text-xs"
        >
          {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : isResending ? 'Sending…' : 'Resend email'}
        </Button>
      ) : null}
    </div>
  )
}
