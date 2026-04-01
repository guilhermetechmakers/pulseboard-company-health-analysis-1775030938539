import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { AdminUserRow } from '@/types/admin'

interface SuspendUserDialogProps {
  user: AdminUserRow | null
  open: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: (user: AdminUserRow) => void
}

export function SuspendUserDialog({ user, open, isPending, onClose, onConfirm }: SuspendUserDialogProps) {
  if (!open || !user) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
      role="presentation"
      onClick={() => !isPending && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && !isPending && onClose()}
    >
      <Card
        className="max-w-md p-6 shadow-lg animate-scale-in motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          <ShieldAlert className="h-8 w-8 shrink-0 text-warning" aria-hidden />
          <div>
            <h2 id="suspend-dialog-title" className="text-lg font-semibold">
              {user.status === 'suspended' ? 'Reactivate account?' : 'Suspend account?'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {user.email} — this updates <code className="rounded bg-muted px-1">account_status</code> and is recorded in
              admin audit logs.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={user.status === 'suspended' ? 'primary' : 'outline'}
                className={
                  user.status === 'suspended'
                    ? 'transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none'
                    : 'border-destructive text-destructive transition-transform duration-200 hover:scale-[1.02] hover:bg-destructive/10 motion-reduce:transform-none'
                }
                disabled={isPending}
                onClick={() => onConfirm(user)}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
