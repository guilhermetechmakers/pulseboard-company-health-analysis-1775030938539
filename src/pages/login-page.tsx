import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthCredentialsForm } from '@/components/auth/auth-credentials-form'
import { AuthForm } from '@/components/auth/auth-form'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { logUserActivity } from '@/lib/auth-activity'
import { navigateAfterAuth } from '@/lib/auth-navigation'
import type { LoginFormValues } from '@/lib/auth-schemas'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? null

  const onSubmit = async (values: LoginFormValues) => {
    if (!supabase) {
      toast.error('Supabase is not configured.')
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      const userId = data.user?.id
      if (userId) {
        await logUserActivity(userId, 'user_login', {})
      }
      toast.success('Welcome back.')
      await navigateAfterAuth(navigate, { fromPath })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign in failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8 md:py-12">
      <AuthForm
        title="Welcome back"
        description="Sign in to your workspace. Sessions persist securely via Supabase Auth."
        footer={
          <span>
            New to PulseBoard?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </span>
        }
      >
        <AuthCredentialsForm isLoading={isLoading} onSubmit={(v) => void onSubmit(v)} />
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
            <span className="bg-card px-2">Or continue with</span>
          </div>
        </div>
        <SocialLoginButtons redirectPath="/dashboard" />
      </AuthForm>
    </div>
  )
}
