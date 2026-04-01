import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-95',
  secondary: 'border border-border bg-card text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
