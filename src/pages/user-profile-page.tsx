import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Activity, UserCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BillingOverviewCard } from '@/components/auth/billing-overview-card'
import { MFASetupPanel } from '@/components/auth/mfa-setup-panel'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { logUserActivity } from '@/lib/auth-activity'
import {
  profileBasicsSchema,
  profilePasswordSchema,
  type ProfileBasicsValues,
  type ProfilePasswordValues,
} from '@/lib/auth-schemas'
import { supabase } from '@/lib/supabase'
import { useUserActivityLog, useUserProfile, useUserSubscription } from '@/hooks/use-auth-profile'

export function UserProfilePage() {
  const queryClient = useQueryClient()
  const { user, signOut, isConfigured } = useAuth()
  const userId = user?.id
  const email = user?.email ?? ''

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId)
  const { data: subscription, isLoading: subLoading } = useUserSubscription(userId)
  const { data: activityRows, isLoading: actLoading } = useUserActivityLog(userId)

  const activities = Array.isArray(activityRows) ? activityRows : []

  const basicsForm = useForm<ProfileBasicsValues>({
    resolver: zodResolver(profileBasicsSchema),
    values: {
      fullName:
        profile?.display_name ??
        (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''),
    },
  })

  const passwordForm = useForm<ProfilePasswordValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const saveBasics = useMutation({
    mutationFn: async (values: ProfileBasicsValues) => {
      if (!supabase || !userId || !email) throw new Error('Not signed in')
      const { error: pErr } = await supabase.from('profiles').update({ display_name: values.fullName.trim() }).eq('id', userId)
      if (pErr) throw pErr
      const { error: uErr } = await supabase.auth.updateUser({
        data: { full_name: values.fullName },
      })
      if (uErr) throw uErr
      await logUserActivity(userId, 'profile_updated', { section: 'basics' })
    },
    onSuccess: async () => {
      toast.success('Profile saved.')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'profile', userId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const changePassword = useMutation({
    mutationFn: async (values: ProfilePasswordValues) => {
      if (!supabase || !email) throw new Error('Not signed in')
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: values.currentPassword,
      })
      if (signErr) throw new Error('Current password is incorrect.')
      const { error } = await supabase.auth.updateUser({ password: values.newPassword })
      if (error) throw error
      if (userId) {
        await logUserActivity(userId, 'password_changed', {})
      }
    },
    onSuccess: async () => {
      toast.success('Password updated.')
      passwordForm.reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!isConfigured) {
    return (
      <section className="space-y-4">
        <h1>Profile</h1>
        <p className="text-sm text-muted-foreground">Configure Supabase to manage your account.</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="space-y-4 animate-fade-in">
        <h1>Profile</h1>
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{' '}
          to view your profile.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Account & security</h1>
          <p className="text-muted-foreground">Manage your profile, billing snapshot, MFA, and activity.</p>
        </div>
        <Button variant="outline" className="h-11 rounded-lg" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-primary/10 p-4 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle className="text-base">Profile</CardTitle>
          </div>
          {profileLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <form
              onSubmit={basicsForm.handleSubmit((v) => saveBasics.mutate(v))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prof-email">Email</Label>
                <Input id="prof-email" value={email} disabled className="h-11 rounded-lg bg-muted/50" readOnly />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prof-name">Display name</Label>
                <Input id="prof-name" className="h-11 rounded-lg" {...basicsForm.register('fullName')} />
                {basicsForm.formState.errors.fullName?.message ? (
                  <p className="text-xs text-destructive">{basicsForm.formState.errors.fullName.message}</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="h-11 rounded-lg" disabled={saveBasics.isPending}>
                  {saveBasics.isPending ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <BillingOverviewCard subscription={subscription ?? null} isLoading={subLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 shadow-card">
          <CardTitle className="mb-4 text-base">Change password</CardTitle>
          <form
            onSubmit={passwordForm.handleSubmit((v) => changePassword.mutate(v))}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="cur-pw">Current password</Label>
              <Input id="cur-pw" type="password" autoComplete="current-password" className="h-11 rounded-lg" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword?.message ? (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" autoComplete="new-password" className="h-11 rounded-lg" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword?.message ? (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw2">Confirm new password</Label>
              <Input id="new-pw2" type="password" autoComplete="new-password" className="h-11 rounded-lg" {...passwordForm.register('confirmPassword')} />
              {passwordForm.formState.errors.confirmPassword?.message ? (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
            <Button type="submit" variant="secondary" className="h-11 rounded-lg" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </Card>

        <MFASetupPanel />
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle className="text-base">Recent activity</CardTitle>
        </div>
        {actLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet. Sign in, run analyses, and connect integrations to populate this log.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {activities.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium capitalize text-foreground">{row.action.replace(/_/g, ' ')}</span>
                <time className="text-xs text-muted-foreground" dateTime={row.created_at}>
                  {format(new Date(row.created_at), 'MMM d, yyyy HH:mm')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
