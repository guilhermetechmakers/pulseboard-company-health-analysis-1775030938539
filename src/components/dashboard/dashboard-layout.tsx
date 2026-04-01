import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export interface DashboardLayoutProps extends PropsWithChildren {
  className?: string
}

/**
 * Primary workspace shell: subtle animated mesh + readable content column.
 */
export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-2xl', className)}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[length:200%_200%] motion-safe:animate-gradient-shift motion-reduce:animate-none"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(11, 106, 247, 0.08) 0%, rgba(6, 79, 214, 0.04) 35%, rgba(22, 163, 74, 0.06) 70%, rgba(11, 106, 247, 0.07) 100%)',
        }}
        aria-hidden
      />
      <div className="relative space-y-8 px-0 py-1">{children}</div>
    </div>
  )
}
