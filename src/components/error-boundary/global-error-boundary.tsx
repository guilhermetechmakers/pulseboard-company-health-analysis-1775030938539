import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { reportClientRuntimeError } from '@/lib/client-error-reporter'

type Props = { children: ReactNode }

type State = { hasError: boolean; error: Error | null }

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientRuntimeError({
      error,
      componentStack: info?.componentStack,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6 animate-fade-in motion-reduce:animate-none">
          <Card className="surface-card max-w-lg border-destructive/25 p-8 shadow-card" role="alert">
            <div className="mb-4 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Something went wrong</h1>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              An unexpected error occurred. The incident was recorded for review. You can try again or refresh the page.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={this.handleRetry} className="transition-transform duration-200 hover:scale-[1.02]">
                Try again
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
                    ;(globalThis as { location: Location }).location.reload()
                  }
                }}
              >
                Reload
              </Button>
            </div>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
