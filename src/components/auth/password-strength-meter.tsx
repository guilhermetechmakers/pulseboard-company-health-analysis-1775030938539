import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

function scorePassword(pw: string): { score: number; label: string } {
  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (/[A-Z]/.test(pw)) score += 1
  if (/[a-z]/.test(pw)) score += 1
  if (/[0-9]/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  const capped = Math.min(score, 5)
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  return { score: capped, label: labels[capped] ?? 'Too weak' }
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { score, label } = scorePassword(password ?? '')
  const pct = (score / 5) * 100

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Password strength</span>
        <span className={cn(score >= 3 ? 'text-accent' : score >= 1 ? 'text-warning' : 'text-destructive')}>{label}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <ul className="text-xs text-muted-foreground">
        <li className={password.length >= 8 ? 'text-accent' : ''}>At least 8 characters</li>
        <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-accent' : ''}>Upper and lower case</li>
        <li className={/[0-9]/.test(password) ? 'text-accent' : ''}>At least one number</li>
        <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-accent' : ''}>One symbol</li>
      </ul>
    </div>
  )
}
