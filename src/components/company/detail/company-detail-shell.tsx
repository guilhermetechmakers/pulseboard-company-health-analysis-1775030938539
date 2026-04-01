import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CompanyDetailShellProps {
  children: ReactNode
  className?: string
}

export function CompanyDetailShell({ children, className }: CompanyDetailShellProps) {
  return (
    <section className={cn('space-y-8 animate-fade-in-up motion-reduce:animate-none', className)} aria-label="Company workspace">
      {children}
    </section>
  )
}
