import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AuthForm } from '@/components/auth/auth-form'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { newPasswordSchema } from '@/lib/auth-schemas'
import { invokeAuthServerLog } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import type { Session } from '@supabase/supabase-js'

type FormValues = z.infer<typeof newPasswordSchema>

export function PasswordResetConfirmPage() {
  const { token: _token } = useParams<{ token: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const pwd = watch('password') ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!supabase) {
        setChecked(true)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!cancelled) {
        setSession(data.session ?? null)
        setChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (values: FormValues) => {
    if (!supabase) {
      toast.error('Supabase is not configured.')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) {
        toast.error(error.message)
        return
      }
      void invokeAuthServerLog({ eventType: 'password_reset_completed' })
      toast.success('Password updated. You can sign in with your new password.')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!checked) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-sm text-muted-foreground animate-pulse motion-reduce:animate-none">
        Validating your reset link…
      </div>
    )
  }

  if (!supabase || !session) {
    return (
      <div className="mx-auto max-w-lg py-8 md:py-12">
        <AuthForm
          title="Link expired or invalid"
          description="Request a new password reset email. Recovery links are single-use and time-limited."
          footer={
            <Link to="/password-reset" className="font-medium text-primary hover:underline">
              Request a new link
            </Link>
          }
        >
          <p className="text-sm text-muted-foreground">
            If you followed a link from email, ensure you open it on this same device/browser, or paste the full URL from the
            message.
            {_token ? ' (Path token is reserved for custom flows; Supabase uses hash-based recovery.)' : ''}
          </p>
        </AuthForm>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-8 md:py-12">
      <AuthForm
        title="Choose a new password"
        description="Use a strong password you have not used elsewhere. This completes your recovery flow."
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="npw">New password</Label>
            <Input id="npw" type="password" autoComplete="new-password" className="h-11 rounded-lg" {...register('password')} />
            <PasswordStrengthMeter password={pwd} />
            {errors.password?.message ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="npw2">Confirm password</Label>
            <Input id="npw2" type="password" autoComplete="new-password" className="h-11 rounded-lg" {...register('confirmPassword')} />
            {errors.confirmPassword?.message ? <p className="text-xs text-destructive">{errors.confirmPassword.message}</p> : null}
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-primary font-medium shadow-md transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 motion-reduce:transform-none"
            disabled={isLoading}
          >
            {isLoading ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </AuthForm>
    </div>
  )
}
