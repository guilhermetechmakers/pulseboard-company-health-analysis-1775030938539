import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataExportConsole } from '@/components/data-io/data-export-console'
import { useMyCompany } from '@/hooks/use-my-company'

export function DataExportPage() {
  const { data: company, isLoading } = useMyCompany()
  const companyId = company?.id

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </section>
    )
  }

  if (!companyId) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Data export</h1>
        <Card className="p-8 text-center text-muted-foreground">
          Create a company before exporting data.
          <Button asChild className="mt-4 min-h-[44px]">
            <Link to="/company/create">Create company</Link>
          </Button>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6 animate-fade-in-up motion-reduce:animate-none">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Data export console</h1>
          <p className="mt-1 text-muted-foreground">
            Backup and compliance exports with presets, optional schedule notes, and downloadable CSV payloads.
          </p>
        </div>
        <Button asChild variant="secondary" className="min-h-[44px]">
          <Link to="/company">Back to workspace</Link>
        </Button>
      </div>
      <DataExportConsole companyId={companyId} />
    </section>
  )
}
