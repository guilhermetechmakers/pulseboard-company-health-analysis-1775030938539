import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfileSettingsMutation } from '@/hooks/use-settings-module'
import type { Database } from '@/types/database'
import { SUPPORTED_LOCALES, SUPPORTED_TIMEZONES } from '@/types/settings'
import { cn } from '@/lib/utils'

const profileSchema = z.object({
  display_name: z.string().min(1, 'Name is required').max(120),
  avatar_url: z
    .string()
    .max(2048)
    .optional()
    .refine((v) => !v || v === '' || /^https:\/\/.+/i.test(v), {
      message: 'Avatar must be a secure https URL',
    }),
  job_title: z.string().max(120).optional().or(z.literal('')),
  role: z.string().min(1).max(40),
  timezone: z.string().min(1),
  language: z.string().min(2).max(12),
  preferred_communication_channel: z.enum(['email', 'in_app', 'both']),
})

type ProfileForm = z.infer<typeof profileSchema>

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface ProfileEditorProps {
  userId: string | undefined
  profile: ProfileRow | null | undefined
  isLoading: boolean
}

export function ProfileEditor({ userId, profile, isLoading }: ProfileEditorProps) {
  const formId = useId()
  const save = useProfileSettingsMutation(userId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      avatar_url: '',
      job_title: '',
      role: 'founder',
      timezone: 'UTC',
      language: 'en',
      preferred_communication_channel: 'email',
    },
  })

  useEffect(() => {
    if (!profile) return
    reset({
      display_name: profile.display_name ?? '',
      avatar_url: profile.avatar_url ?? '',
      job_title: profile.job_title ?? '',
      role: profile.role || 'founder',
      timezone: profile.timezone ?? 'UTC',
      language: profile.language ?? 'en',
      preferred_communication_channel:
        profile.preferred_communication_channel === 'in_app' ||
        profile.preferred_communication_channel === 'both' ||
        profile.preferred_communication_channel === 'email'
          ? profile.preferred_communication_channel
          : 'email',
    })
  }, [profile, reset])

  async function onSubmit(values: ProfileForm) {
    await save.mutateAsync({
      display_name: values.display_name.trim(),
      avatar_url: values.avatar_url?.trim() || null,
      job_title: values.job_title?.trim() || null,
      role: values.role,
      timezone: values.timezone,
      language: values.language,
      preferred_communication_channel: values.preferred_communication_channel,
    })
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Identity and locale preferences. Changes apply across the workspace and dashboard.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit(onSubmit)}
        aria-describedby={`${formId}-profile-hint`}
        noValidate
      >
        <p id={`${formId}-profile-hint`} className="sr-only">
          Edit your display name, avatar URL, job title, role, timezone, language, and preferred channel.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-name`}>Full name</Label>
            <Input id={`${formId}-name`} className="mt-1" {...register('display_name')} aria-invalid={Boolean(errors.display_name)} />
            {errors.display_name ? (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errors.display_name.message}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor={`${formId}-avatar`}>Avatar URL (https)</Label>
            <Input id={`${formId}-avatar`} className="mt-1" placeholder="https://…" {...register('avatar_url')} />
            {errors.avatar_url ? (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errors.avatar_url.message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-job`}>Job title / role label</Label>
            <Input id={`${formId}-job`} className="mt-1" {...register('job_title')} />
          </div>
          <div>
            <Label htmlFor={`${formId}-prole`}>Workspace role</Label>
            <select
              id={`${formId}-prole`}
              className={cn(
                'mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              {...register('role')}
            >
              <option value="founder">Founder / Owner</option>
              <option value="consultant">Consultant / Agency</option>
              <option value="investor">Investor</option>
              <option value="other">Other</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-tz`}>Timezone</Label>
            <select
              id={`${formId}-tz`}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('timezone')}
            >
              {(SUPPORTED_TIMEZONES ?? []).map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`${formId}-lang`}>Language</Label>
            <select
              id={`${formId}-lang`}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('language')}
            >
              {(SUPPORTED_LOCALES ?? []).map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor={`${formId}-channel`}>Preferred communication</Label>
          <select
            id={`${formId}-channel`}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('preferred_communication_channel')}
          >
            <option value="email">Email</option>
            <option value="in_app">In-app only</option>
            <option value="both">Email and in-app</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={save.isPending || !isDirty} className="min-h-[44px] transition-transform duration-200 hover:scale-[1.02]">
            {save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
