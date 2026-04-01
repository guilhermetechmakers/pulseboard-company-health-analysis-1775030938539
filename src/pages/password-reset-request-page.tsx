import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AuthForm } from '@/components/auth/auth-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passwordResetRequestSchema } from '@/lib/auth-schemas'
import { invokeAuthServerLog } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

type FormValues = z.infer<typeof passwordResetRequestSchema>

export function PasswordResetRequestPage() {
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: FormValues) => {
    if (!supabase) {
      toast.error('Supabase is not configured.')
      return
    }
    setIsLoading(true)
    try {
      const redirectTo = `${window.location.origin}/password-reset/confirm`
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo })
      if (error) {
        toast.error(error.message)
        return
      }
      void invokeAuthServerLog({
        eventType: 'password_reset_requested',
        email: values.email.trim(),
      })
      setSent(true)
      toast.success('If an account exists, you will receive reset instructions.')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8 md:py-12">
      <AuthForm
        title="Reset your password"
        description={
          sent
            ? 'Check your email for a secure link. Links expire for your protection.'
            : 'Enter your email and we will send a one-time link to choose a new password.'
        }
        footer={
          <span>
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </span>
        }
      >
        {sent ? (
          <div className="space-y-4 animate-fade-in motion-reduce:animate-none">
            <p className="text-sm text-muted-foreground">
              Did not get an email? Check spam folders or request again in a few minutes. Rate limits may apply on repeated
              attempts.
            </p>
            <Button type="button" variant="outline" className="h-11 w-full rounded-lg" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                className="h-11 rounded-lg"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email?.message ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>
            <Button type="submit" className="h-11 w-full rounded-lg" disabled={isLoading}>
              {isLoading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </AuthForm>
    </div>
  )
}
