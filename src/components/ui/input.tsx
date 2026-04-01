import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'
