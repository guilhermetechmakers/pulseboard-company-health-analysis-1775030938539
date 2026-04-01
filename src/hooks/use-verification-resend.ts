import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

const COOLDOWN_SEC = 60

export function useVerificationResend(email: string | undefined) {
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(t)
  }, [cooldown])

  const resend = useCallback(async () => {
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

  return { resend, cooldown, isSending }
}
