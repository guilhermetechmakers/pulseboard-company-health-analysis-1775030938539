import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { applyTemplate } from '@/lib/notifications-template'
import { EmailPreviewCard } from '@/components/notifications/email-preview-card'

export interface EmailTemplatePreviewProps {
  templateType: string
  samplePlaceholders: Record<string, string>
}

export function EmailTemplatePreview({ templateType, samplePlaceholders }: EmailTemplatePreviewProps) {
  const q = useQuery({
    queryKey: ['email-template', templateType],
    enabled: Boolean(supabase) && Boolean(templateType),
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('email_templates')
        .select('subject, body_html, body_text')
        .eq('type', templateType)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })

  if (q.isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />
  }

  if (!q.data) {
    return (
      <Card className="border-dashed p-4 text-sm text-muted-foreground">
        No template found for <span className="font-mono">{templateType}</span> (configure Supabase and run migrations).
      </Card>
    )
  }

  const subject = applyTemplate(q.data.subject ?? '', samplePlaceholders)
  const html = applyTemplate(q.data.body_html ?? '', samplePlaceholders)
  const text = applyTemplate(q.data.body_text ?? '', samplePlaceholders)

  return (
    <div className="space-y-3">
      <EmailPreviewCard subject={subject} previewText={text || html.replace(/<[^>]+>/g, ' ')} />
      <details className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground motion-reduce:transition-none">
        <summary className="cursor-pointer font-medium text-foreground">HTML source</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px]">{html}</pre>
      </details>
    </div>
  )
}
