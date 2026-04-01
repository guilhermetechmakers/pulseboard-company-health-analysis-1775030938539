import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardTitle } from '@/components/ui/card'

interface AuthFormProps {
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Shared layout shell for login and signup — PulseBoard tokens, card elevation, subtle motion.
 */
export function AuthForm({ title, description, children, footer, className }: AuthFormProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-6 shadow-card backdrop-blur-sm animate-fade-in-up motion-reduce:animate-none md:p-8',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl motion-reduce:opacity-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-2xl motion-reduce:opacity-0"
        aria-hidden
      />
      <div className="relative space-y-6">
        <div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">{title}</CardTitle>
          {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <Card className="border-0 bg-transparent p-0 shadow-none">{children}</Card>
        {footer ? <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  )
}
