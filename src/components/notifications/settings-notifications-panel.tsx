import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { EmailTemplatePreview } from '@/components/notifications/email-template-preview'
import {
  useNotificationPreferences,
  useRecentEmailDispatches,
  useTestInAppNotification,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications'
import { invokeEmailRetry, invokeSendTransactionalEmail } from '@/lib/supabase-functions'
import type {
  NotificationChannelEventKey,
  NotificationChannelPrefs,
  UserNotificationChannels,
} from '@/types/notifications'
import { cn } from '@/lib/utils'

const EVENTS: { id: NotificationChannelEventKey; label: string; description: string }[] = [
  { id: 'analysis_complete', label: 'Analysis complete', description: 'When the AI health report finishes successfully.' },
  { id: 'export_ready', label: 'Export ready', description: 'When PDF/HTML export completes.' },
  { id: 'job_failed', label: 'Job failed', description: 'When analysis or export jobs fail.' },
  { id: 'billing_alert', label: 'Billing', description: 'Subscription and invoice notices.' },
  { id: 'admin_alert', label: 'Admin', description: 'Operational or compliance notices.' },
  { id: 'snapshot_created', label: 'Report snapshot', description: 'When you save a report version.' },
  { id: 'report_saved', label: 'Report edits', description: 'When narrative sections are saved.' },
]

function defaultToggle(): NotificationChannelPrefs {
  return { inApp: true, email: true }
}

export function SettingsNotificationsPanel() {
  const { data: remote, isLoading } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()
  const testInApp = useTestInAppNotification()
  const dispatches = useRecentEmailDispatches(12)
  const [draft, setDraft] = useState<UserNotificationChannels>({})

  const merged = useMemo(() => {
    const base: UserNotificationChannels = {}
    for (const e of EVENTS) {
      const r = remote?.[e.id]
      base[e.id] = {
        inApp: r?.inApp !== false,
        email: r?.email !== false,
      }
    }
    return base
  }, [remote])

  useEffect(() => {
    setDraft(merged)
  }, [merged])

  const effective = useMemo(() => {
    const out: UserNotificationChannels = { ...merged, ...draft }
    return out
  }, [merged, draft])

  function patchEvent(id: NotificationChannelEventKey, patch: Partial<NotificationChannelPrefs>) {
    const prev = effective[id] ?? defaultToggle()
    setDraft((d: UserNotificationChannels) => ({
      ...d,
      [id]: { ...prev, ...patch },
    }))
  }

  async function onSave() {
    await update.mutateAsync(effective)
  }

  async function onTestEmail() {
    try {
      const res = await invokeSendTransactionalEmail({
        templateType: 'analysis_complete',
        placeholders: {
          userName: 'PulseBoard user',
          companyName: 'Sample Co.',
          analysisId: '00000000-0000-0000-0000-000000000000',
          reportUrl: `${window.location.origin}/dashboard`,
        },
      })
      const data = res?.data as { skipped?: boolean; sent?: boolean; reason?: string } | undefined
      if (data?.skipped || data?.sent === false) {
        toast.message('Email skipped', { description: data.reason ?? 'Check Resend secrets or preferences.' })
      } else {
        toast.success('Test email dispatched')
      }
    } catch (e) {
      toast.error((e as Error).message ?? 'Test email failed')
    }
  }

  return (
    <Card className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Notifications & email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose in-app vs email per event. Transactional delivery uses Resend from Edge Functions — keys never ship to the
          browser.
        </p>
      </div>

      <div className="space-y-4">
        {(EVENTS ?? []).map((ev) => {
          const row = effective[ev.id] ?? defaultToggle()
          return (
            <div
              key={ev.id}
              className="grid gap-4 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-medium text-foreground">{ev.label}</p>
                <p className="text-sm text-muted-foreground">{ev.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`inapp-${ev.id}`}
                  checked={row.inApp}
                  onCheckedChange={(v) => patchEvent(ev.id, { inApp: v })}
                  disabled={isLoading}
                />
                <Label htmlFor={`inapp-${ev.id}`} className="text-sm font-normal">
                  In-app
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`email-${ev.id}`}
                  checked={row.email}
                  onCheckedChange={(v) => patchEvent(ev.id, { email: v })}
                  disabled={isLoading}
                />
                <Label htmlFor={`email-${ev.id}`} className="text-sm font-normal">
                  Email
                </Label>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" disabled={update.isPending || isLoading} onClick={() => void onSave()}>
          {update.isPending ? 'Saving…' : 'Save preferences'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void onTestEmail()}>
          Send test email
        </Button>
        <Button type="button" variant="secondary" disabled={testInApp.isPending} onClick={() => void testInApp.mutateAsync()}>
          {testInApp.isPending ? 'Creating…' : 'Test in-app notification'}
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">Recent email deliveries</h3>
        <p className="text-xs text-muted-foreground">Status updates from Resend webhooks appear on each dispatch when configured.</p>
        <ul className="space-y-2 text-sm">
          {(dispatches.data ?? []).length === 0 ? (
            <li className="text-muted-foreground">No sends logged yet.</li>
          ) : (
            (dispatches.data ?? []).map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.template_type} · {d.status}
                    {d.to_address ? ` · ${d.to_address}` : ''}
                  </p>
                </div>
                {d.status === 'failed' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 shrink-0 text-xs"
                    onClick={() =>
                      void invokeEmailRetry(d.id).then(
                        () => toast.success('Retry queued'),
                        (e) => toast.error((e as Error).message),
                      )
                    }
                  >
                    Retry
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className={cn('space-y-2 border-t border-border pt-6')}>
        <h3 className="text-sm font-semibold">Template preview</h3>
        <EmailTemplatePreview
          templateType="analysis_complete"
          samplePlaceholders={{
            userName: 'Alex',
            companyName: 'Northwind Labs',
            analysisId: 'demo-report-id',
            reportUrl: 'https://pulseboard.app/report/demo',
          }}
        />
      </div>
    </Card>
  )
}
