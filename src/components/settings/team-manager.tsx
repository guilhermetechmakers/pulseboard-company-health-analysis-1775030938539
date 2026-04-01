import { useId, useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, UserMinus, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useSettingsTeamBundle,
  useTeamInviteMutation,
  useTeamRemoveMemberMutation,
  useTeamRevokeInviteMutation,
} from '@/hooks/use-settings-module'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'member', 'viewer']),
})

type InviteForm = z.infer<typeof inviteSchema>

export interface TeamManagerProps {
  companyId: string
}

export function TeamManager({ companyId }: TeamManagerProps) {
  const formId = useId()
  const { user } = useAuth()
  const { data, isLoading } = useSettingsTeamBundle(companyId)
  const inviteMut = useTeamInviteMutation(companyId)
  const revokeMut = useTeamRevokeInviteMutation(companyId)
  const removeMut = useTeamRemoveMemberMutation(companyId)
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' },
  })

  const team = data?.team
  const members = Array.isArray(data?.members) ? data?.members : []
  const invites = Array.isArray(data?.invites) ? data?.invites : []

  async function onInvite(values: InviteForm) {
    if (user?.email && values.email.toLowerCase() === user.email.toLowerCase()) {
      toast.error('You cannot invite your own email.')
      return
    }
    await inviteMut.mutateAsync({ email: values.email, role: values.role })
    reset({ email: '', role: values.role })
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-4 h-32 w-full" />
      </Card>
    )
  }

  return (
    <>
      <Card className="p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Team</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite collaborators by email. Seats:{' '}
              <span className="font-medium text-foreground">
                {members.length + invites.length}/{team?.seats ?? '—'}
              </span>
              . Only the workspace owner can manage membership.
            </p>
          </div>
          <Users className="h-8 w-8 text-primary/80" aria-hidden />
        </div>

        <form className="mt-6 grid gap-4 border-t border-border pt-6 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit(onInvite)}>
          <div>
            <Label htmlFor={`${formId}-email`}>Invite email</Label>
            <Input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              className="mt-1"
              placeholder="colleague@company.com"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 md:pt-6">
            <Label htmlFor={`${formId}-role`} className="md:sr-only">
              Role
            </Label>
            <select
              id={`${formId}-role`}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('role')}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" variant="secondary" disabled={inviteMut.isPending} className="min-h-[44px]">
              {inviteMut.isPending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>

        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Active members</h3>
          <ul className="space-y-2" aria-label="Team members">
            {(members ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No members loaded.</li>
            ) : (
              (members ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{m.displayName ?? m.email ?? m.user_id}</p>
                    <p className="text-xs text-muted-foreground">{m.email ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === 'owner' ? 'default' : 'outline'}>{m.role}</Badge>
                    {m.role !== 'owner' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 gap-1 px-3 text-destructive hover:text-destructive"
                        aria-label={`Remove ${m.displayName ?? m.email ?? 'member'}`}
                        onClick={() =>
                          setRemoveTarget({
                            id: m.id,
                            label: m.displayName ?? m.email ?? 'this member',
                          })
                        }
                      >
                        <UserMinus className="h-4 w-4" aria-hidden />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Pending invites</h3>
          <ul className="space-y-2" aria-label="Pending invitations">
            {(invites ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No pending invites.</li>
            ) : (
              (invites ?? []).map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate text-sm font-medium">{inv.email}</span>
                    <Badge variant="outline">{inv.role}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3"
                    onClick={() => void revokeMut.mutateAsync(inv.id)}
                    disabled={revokeMut.isPending}
                  >
                    Revoke
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Card>

      <Dialog open={removeTarget !== null} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              {removeTarget?.label} will lose access to this workspace team. This does not delete their PulseBoard account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
              disabled={removeMut.isPending}
              onClick={() => {
                if (!removeTarget) return
                void removeMut.mutateAsync(removeTarget.id).then(() => setRemoveTarget(null))
              }}
            >
              {removeMut.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
