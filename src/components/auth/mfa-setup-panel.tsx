import { useCallback, useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardTitle } from '@/components/ui/card'

interface MfaFactor {
  id: string
  factor_type?: string
  friendly_name?: string
  status?: string
}

export function MFASetupPanel() {
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [enabledUi, setEnabledUi] = useState(false)

  const refreshFactors = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      toast.error(error.message)
      setFactors([])
      setLoading(false)
      return
    }
    const all = data?.all ?? []
    const safe = Array.isArray(all) ? all : []
    const mapped: MfaFactor[] = safe.map((f) => ({
      id: f.id,
      factor_type: f.factor_type,
      friendly_name: f.friendly_name,
      status: f.status,
    }))
    setFactors(mapped)
    const verified = mapped.filter((f) => f.status === 'verified')
    setEnabledUi(verified.length > 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refreshFactors()
  }, [refreshFactors])

  async function startEnroll() {
    if (!supabase) return
    setEnrolling(true)
    setFactorId(null)
    setQr(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'PulseBoard authenticator' })
    setEnrolling(false)
    if (error) {
      toast.error(error.message)
      return
    }
    const id = data?.id ?? null
    const qrCode = data?.totp?.qr_code ?? null
    setFactorId(id)
    setQr(qrCode)
    toast.message('Scan the QR code, then enter the 6-digit code.')
  }

  async function confirmEnroll() {
    if (!supabase || !factorId) return
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
    if (chErr || !challenge?.id) {
      toast.error(chErr?.message ?? 'Could not start MFA challenge')
      return
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode.replace(/\s/g, ''),
    })
    if (error) {
      toast.error(error.message)
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (uid) {
      await supabase.from('user_mfa_settings').upsert(
        {
          user_id: uid,
          enabled: true,
          factor_id: factorId,
          recovery_codes_remaining: 0,
        },
        { onConflict: 'user_id' },
      )
    }
    toast.success('Two-factor authentication is on')
    setVerifyCode('')
    setFactorId(null)
    setQr(null)
    void refreshFactors()
  }

  async function disableMfa() {
    const verified = factors.find((f) => f.status === 'verified')
    if (!supabase || !verified?.id) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id })
    if (error) {
      toast.error(error.message)
      return
    }
    const uid = (await supabase.auth.getUser()).data.user?.id
    if (uid) {
      await supabase.from('user_mfa_settings').upsert(
        { user_id: uid, enabled: false, factor_id: null },
        { onConflict: 'user_id' },
      )
    }
    toast.success('MFA disabled')
    void refreshFactors()
  }

  if (!supabase) {
    return (
      <Card className="surface-card p-4">
        <p className="text-sm text-muted-foreground">Configure Supabase to manage two-factor authentication.</p>
      </Card>
    )
  }

  return (
    <Card className="surface-card space-y-4 p-4 animate-fade-in motion-reduce:animate-none">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" aria-hidden />
        <CardTitle className="text-base">Two-factor authentication (TOTP)</CardTitle>
      </div>
      <p className="text-sm text-muted-foreground">
        Add an authenticator app for an extra layer on sensitive actions. Requires MFA to be enabled in your Supabase project.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading factors…</p>
      ) : (
        <div className="flex items-center gap-3">
          <Switch
            checked={enabledUi}
            onCheckedChange={(next) => {
              if (next) void startEnroll()
              else void disableMfa()
            }}
            aria-label="Toggle two-factor authentication"
          />
          <span className="text-sm font-medium">{enabledUi ? 'Enabled' : 'Disabled'}</span>
          {enrolling ? <span className="text-xs text-muted-foreground">Preparing…</span> : null}
        </div>
      )}
      {qr ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 animate-scale-in motion-reduce:animate-none">
          <p className="text-sm font-medium">Scan with your app</p>
          <img src={qr} alt="TOTP QR code" className="mx-auto max-h-44 rounded-lg border bg-background p-2" />
          <div className="space-y-2">
            <Label htmlFor="mfa-code">6-digit code</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="000000"
            />
            <Button type="button" className="w-full sm:w-auto" onClick={() => void confirmEnroll()}>
              Verify and enable
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
