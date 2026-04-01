import type { ReactNode } from 'react'
import { Card, CardTitle } from '@/components/ui/card'

interface PageTemplateProps {
  title: string
  description: string
  children?: ReactNode
}

export function PageTemplate({ title, description, children }: PageTemplateProps) {
  return (
    <section className="space-y-4">
      <div>
        <h1>{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardTitle className="mb-2">Implementation Baseline</CardTitle>
        <p className="text-sm text-muted-foreground">
          This screen is wired with PulseBoard routing, design tokens, and API-ready UI scaffolding.
        </p>
      </Card>
      {children}
    </section>
  )
}
