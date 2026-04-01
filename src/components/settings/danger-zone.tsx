import { useId, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { deleteAccountWithPassword } from '@/api/settings'
import { logUserActivity } from '@/lib/auth-activity'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export interface DangerZoneProps {
  companyId: string
}

export function DangerZone({ companyId }: DangerZoneProps) {
  const formId = useId()
  const { user, signOut } = useAuth()
  const email = user?.email ?? ''
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  async function onConfirmDelete() {
    if (!supabase || !user?.id || !email) {
      toast.error('Sign in required.')
      return
    }
    if (confirm.trim() !== 'DELETE') {
      toast.error('Type DELETE to confirm.')
      return
    }
    if (!password) {
      toast.error('Enter your password.')
      return
    }
    setBusy(true)
    try {
      await logUserActivity(user.id, 'account_deletion_flow_started', { companyId })
      const res = await deleteAccountWithPassword({
        companyId,
        password,
        confirmPhrase: confirm,
        reason: 'user_initiated_settings',
      })
      if (res?.ok) {
        toast.success(res.message)
        await signOut()
      } else {
        toast.error('Could not complete request.')
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
      setPassword('')
      setConfirm('')
      setOpen(false)
    }
  }

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/[0.03] p-6 shadow-card">
        <div className="flex flex-wrap items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Deleting your account is irreversible after processing. Export reports and CSV backups first. You will be signed
              out immediately after the request is recorded.
            </p>
            <Button
              type="button"
              variant="secondary"
              className={cn('mt-4 border-destructive/40 text-destructive hover:bg-destructive/10')}
              onClick={() => setOpen(true)}
            >
              Request account deletion…
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm account deletion</DialogTitle>
            <DialogDescription>
              This flags your profile for removal and writes an audit entry when the Edge Function is deployed with a service
              role. You must re-enter your password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor={`${formId}-pw`}>Password</Label>
              <Input
                id={`${formId}-pw`}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${formId}-del`}>Type DELETE</Label>
              <Input
                id={`${formId}-del`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1"
                autoComplete="off"
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={() => void onConfirmDelete()}
            >
              {busy ? 'Working…' : 'Submit deletion request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
