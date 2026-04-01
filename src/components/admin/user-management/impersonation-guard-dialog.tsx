import { useState } from 'react'
import { toast } from 'sonner'
import { UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useImpersonateAdminUser } from '@/hooks/use-admin-users'
import type { AdminUserRow } from '@/types/admin'

interface ImpersonationGuardDialogProps {
  user: AdminUserRow | null
  open: boolean
  onClose: () => void
}

/** Confirmation + audit reason before issuing impersonation magic link (admin-only). */
export function ImpersonationGuardDialog({ user, open, onClose }: ImpersonationGuardDialogProps) {
  const [reason, setReason] = useState('')
  const impersonate = useImpersonateAdminUser()

  if (!open || !user) return null

  const submit = () => {
    impersonate.mutate(
      { userId: user.id, auditReason: reason.trim() },
      {
        onSuccess: (res) => {
          toast.success('Impersonation link issued')
          if (res.magicLink) {
            try {
              void navigator.clipboard.writeText(res.magicLink)
              toast.message('Magic link copied', { description: 'Open in a private window to sign in as this user.' })
            } catch {
              toast.message('Copy the magic link manually', { description: 'Clipboard unavailable in this browser.' })
            }
          }
          setReason('')
          onClose()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Impersonation failed'),
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
      role="presentation"
      onClick={() => !impersonate.isPending && onClose()}
    >
      <Card
        className="max-w-md p-6 shadow-lg animate-scale-in motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="impersonate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          <UserCog className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="impersonate-title" className="text-lg font-semibold">
              Impersonate user?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This records an audit entry and issues a one-time magic link for <strong>{user.email || user.name}</strong>.
              Administrator accounts cannot be impersonated.
            </p>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="impersonate-reason">Support / audit note (optional)</Label>
              <Input
                id="impersonate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ticket ID or reason"
                className="rounded-lg"
                disabled={impersonate.isPending}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={impersonate.isPending} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
                disabled={impersonate.isPending}
                onClick={submit}
              >
                {impersonate.isPending ? 'Issuing…' : 'Confirm & issue link'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export { ImpersonationGuardDialog as ImpersonationGuard }
