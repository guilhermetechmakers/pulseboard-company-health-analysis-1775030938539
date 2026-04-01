import { CheckCircle2, Mail } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthForm } from '@/components/auth/auth-form'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { navigateAfterAuth } from '@/lib/auth-navigation'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const COOLDOWN_SEC = 60

const steps = ['Account created', 'Verify email', 'Company setup'] as const

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, session, isEmailVerified, refreshSession, isConfigured } = useAuth()
  const stateEmail = (location.state as { email?: string } | null)?.email ?? ''
  const email = user?.email ?? stateEmail ?? ''
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(t)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!supabase || !email || cooldown > 0) return
    setIsSending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-email`,
        },
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Verification email sent.')
      setCooldown(COOLDOWN_SEC)
    } finally {
      setIsSending(false)
    }
  }, [email, cooldown])

  const continueCta = async () => {
    await refreshSession()
    if (isEmailVerified) {
      await navigateAfterAuth(navigate, { fromPath: null })
    } else {
      toast.message('Please verify your email first, then try again.')
    }
  }

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-lg py-8 md:py-12">
        <AuthForm title="Verify your email" description="Configure Supabase environment variables to enable verification." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-8 md:py-12">
      <AuthForm
        title={isEmailVerified ? 'Email verified' : 'Verify your email'}
        description={
          isEmailVerified
            ? 'Your address is confirmed. Continue to your workspace or finish company setup.'
            : 'We sent a secure link to confirm your address. Verification unlocks analysis jobs and exports.'
        }
        footer={
          <span>
            Wrong address?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Start over
            </Link>
          </span>
        }
      >
        <ol className="mb-6 flex flex-col gap-2 sm:flex-row sm:justify-between" aria-label="Onboarding progress">
          {steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium',
                i === 0 && 'border-accent/40 bg-accent/5 text-foreground',
                i === 1 && 'border-primary/40 bg-primary/5 text-foreground',
                i === 2 && 'border-border text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px]',
                  i <= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>

        {!session && !email ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>{' '}
            to see verification status, or return from signup with your email in session.
          </p>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 animate-fade-in">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">Check your inbox</p>
            <p className="break-all text-sm text-muted-foreground">
              {email ? (
                <>
                  Link sent to <span className="font-medium text-foreground">{email}</span>
                </>
              ) : (
                'Open the message from PulseBoard / Supabase Auth to confirm your email.'
              )}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <EmailVerificationBanner
            email={email}
            isVerified={isEmailVerified}
            onResend={() => void handleResend()}
            isResending={isSending}
            cooldownSeconds={cooldown}
          />
        </div>

        {isEmailVerified ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground animate-scale-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            Your email is verified. You can continue to your workspace.
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="h-11 flex-1 rounded-lg" onClick={() => void refreshSession()}>
            Refresh status
          </Button>
          <Button type="button" className="h-11 flex-1 rounded-lg" onClick={() => void continueCta()}>
            {isEmailVerified ? 'Continue to workspace' : 'I’ve verified — continue'}
          </Button>
        </div>
      </AuthForm>
    </div>
  )
}
