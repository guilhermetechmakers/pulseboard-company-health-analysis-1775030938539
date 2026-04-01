import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { signupSchema, type SignupFormValues } from '@/lib/auth-schemas'
import { logUserActivity } from '@/lib/auth-activity'
import { invokeAuthServerLog } from '@/lib/supabase-functions'
import { AuthForm } from '@/components/auth/auth-form'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const plans: { id: SignupFormValues['planId']; label: string; hint: string }[] = [
  { id: 'free', label: 'Starter', hint: 'Founders & self-serve' },
  { id: 'pro', label: 'Pro', hint: 'Consultants & deeper runs' },
  { id: 'agency', label: 'Agency', hint: 'White-label & volume' },
]

function planTierForMetadata(planId: SignupFormValues['planId']): string {
  if (planId === 'free') return 'starter'
  return planId
}

export function SignupPage() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      companyName: '',
      role: 'founder',
      planId: 'free',
      signupOrigin: 'direct',
      consent: false,
    },
  })

  const passwordWatch = form.watch('password')

  async function onSubmit(values: SignupFormValues) {
    if (!supabase) {
      toast.error('Supabase is not configured')
      return
    }
    setBusy(true)
    try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        emailRedirectTo: `${origin}/verify-email`,
        data: {
          display_name: values.fullName.trim(),
          full_name: values.fullName.trim(),
          role: values.role,
          plan_tier: planTierForMetadata(values.planId),
          signup_origin: values.signupOrigin,
          privacy_consent: String(values.consent),
          company_name: values.companyName?.trim() ?? '',
        },
      },
    })
    if (error) {
      toast.error(error.message ?? 'Could not create account')
      return
    }
    const uid = data.user?.id
    if (uid) {
      const consentAt = values.consent ? new Date().toISOString() : null
      const { error: profileError } = await supabase.from('user_profiles').upsert(
        {
          user_id: uid,
          full_name: values.fullName.trim(),
          signup_origin: values.signupOrigin,
          privacy_consent_at: consentAt,
        },
        { onConflict: 'user_id' },
      )
      if (profileError) {
        toast.error(profileError.message)
      }
      const { error: subError } = await supabase.from('subscriptions').upsert(
        {
          user_id: uid,
          plan_id: values.planId,
          status: 'active',
        },
        { onConflict: 'user_id' },
      )
      if (subError) {
        toast.error(subError.message)
      }
      await logUserActivity(uid, 'user_signup', {
        origin: values.signupOrigin,
        planId: values.planId,
        role: values.role,
      })
      void invokeAuthServerLog({
        eventType: 'signup_telemetry',
        email: values.email.trim(),
        metadata: {
          signup_origin: values.signupOrigin,
          plan_id: values.planId,
          plan_tier: planTierForMetadata(values.planId),
          role: values.role,
        },
      })
    }
    toast.success('Check your email to verify your account')
    navigate('/verify-email', { replace: true, state: { email: values.email.trim() } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4 animate-fade-in-up motion-reduce:animate-none">
      <AuthForm
        title="Create your PulseBoard account"
        description="Structured company health analysis starts with a secure account. Passwords require upper, lower, number, and a symbol."
        footer={
          <p>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((v) => void onSubmit(v))} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="su-email">Work email</Label>
              <Input id="su-email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="su-name">Full name</Label>
              <Input id="su-name" autoComplete="name" {...form.register('fullName')} />
              {form.formState.errors.fullName ? (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="su-company">Company name (optional)</Label>
              <Input id="su-company" {...form.register('companyName')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <Controller
              control={form.control}
              name="planId"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-3">
                  {(plans ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => field.onChange(p.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left text-sm transition-all duration-200 hover:border-primary/50 hover:shadow-card',
                        field.value === p.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card',
                      )}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.hint}</div>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="su-role">Your role</Label>
              <select
                id="su-role"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...form.register('role')}
              >
                <option value="founder">Founder / Owner</option>
                <option value="consultant">Consultant / Agency</option>
                <option value="investor">Investor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-origin">How did you hear about us?</Label>
              <select
                id="su-origin"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...form.register('signupOrigin')}
              >
                <option value="direct">Direct / PulseBoard</option>
                <option value="trial">Trial campaign</option>
                <option value="referral">Referral</option>
                <option value="organic">Organic search</option>
                <option value="search">Search ad</option>
                <option value="ads">Paid ads</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="su-password">Password</Label>
            <Input id="su-password" type="password" autoComplete="new-password" {...form.register('password')} />
            <PasswordStrengthMeter password={passwordWatch ?? ''} />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input id="su-confirm" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Controller
            control={form.control}
            name="consent"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 p-3 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(Boolean(c))} aria-label="Accept privacy policy" />
                <span>
                  I agree to the processing of my data for account setup and product emails, per the PulseBoard privacy policy.
                </span>
              </label>
            )}
          />
          {form.formState.errors.consent ? (
            <p className="text-xs text-destructive">{form.formState.errors.consent.message}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
            <span className="bg-card px-2">Or sign up with</span>
          </div>
        </div>
        <SocialLoginButtons redirectPath="/verify-email" />
      </AuthForm>
    </div>
  )
}
