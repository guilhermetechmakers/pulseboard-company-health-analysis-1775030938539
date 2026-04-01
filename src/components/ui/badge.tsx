import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline'

const styles: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  success: 'border-transparent bg-[rgb(22,163,74)] text-white',
  warning: 'border-transparent bg-[rgb(245,158,11)] text-[rgb(15,23,42)]',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  outline: 'border-border text-foreground',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}
