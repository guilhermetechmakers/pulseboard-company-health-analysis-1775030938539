import { cn } from '@/lib/utils'

interface CheckboxProps {
  id?: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function Checkbox({ id, checked, onCheckedChange, disabled, className, 'aria-label': ariaLabel }: CheckboxProps) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className={cn(
        'h-4 w-4 shrink-0 rounded border border-input bg-background text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
}
