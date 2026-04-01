import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSendExportEmailLink } from '@/hooks/use-export-context'

export interface ExportEmailPanelProps {
  reportId: string
  exportId: string | null
  disabled?: boolean
}

export function ExportEmailPanel({ reportId, exportId, disabled }: ExportEmailPanelProps) {
  const [email, setEmail] = useState('')
  const send = useSendExportEmailLink()

  return (
    <div className="space-y-3 rounded-lg border border-border/80 bg-card/40 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Mail className="h-4 w-4 text-primary" aria-hidden />
        Send download link by email
      </div>
      <p className="text-xs text-muted-foreground">
        Delivers the export-ready email template with a time-limited download link to any address.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="export-email-followup">Recipient email</Label>
          <Input
            id="export-email-followup"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            disabled={disabled || !exportId}
            aria-label="Recipient email for export download link"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 shrink-0 sm:min-w-[120px]"
          disabled={disabled || !exportId || !email.includes('@') || send.isPending}
          onClick={() => {
            if (exportId) send.mutate({ reportId, exportId, email: email.trim() })
          }}
        >
          {send.isPending ? 'Sending…' : 'Send link'}
        </Button>
      </div>
    </div>
  )
}
