import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  completeWizardAndCreateCompany,
  getOnboardingDraft,
  upsertOnboardingDraft,
  logCompanyTelemetryEvent,
  CompanyConflictError,
} from '@/api/companies'
import { EMPTY_WIZARD_DATA, type OnboardingWizardData } from '@/types/company-wizard'
import { wizardCompletenessPercent, wizardMeetsMinimumThreshold } from '@/lib/wizard-completeness'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { invokeComputeHealthScore } from '@/lib/supabase-functions'

const STEP_LABELS = ['Basics', 'Profile', 'Financials', 'Market', 'Social & brand']

function clampStep(n: number): number {
  return Math.min(5, Math.max(1, Math.floor(n)))
}

export function OnboardingWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingWizardData>({ ...EMPTY_WIZARD_DATA })

  const draftQuery = useQuery({
    queryKey: ['onboarding-draft'],
    queryFn: () => getOnboardingDraft(),
  })

  useEffect(() => {
    const d = draftQuery.data
    if (!d) return
    setStep(clampStep(d.step))
    setData(d.data)
  }, [draftQuery.data])

  const debounced = useDebouncedValue(data, 500)
  const debouncedStep = useDebouncedValue(step, 500)

  useEffect(() => {
    if (!draftQuery.isFetched || draftQuery.isFetching) return
    const trivial =
      debouncedStep === 1 &&
      JSON.stringify(debounced) === JSON.stringify(EMPTY_WIZARD_DATA) &&
      draftQuery.data == null
    if (trivial) return
    void (async () => {
      try {
        await upsertOnboardingDraft(debouncedStep, debounced)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Draft save failed'
        toast.error(msg)
      }
    })()
  }, [debounced, debouncedStep, draftQuery.isFetched, draftQuery.isFetching, draftQuery.data])

  const pct = useMemo(() => wizardCompletenessPercent(data), [data])
  const canFinish = wizardMeetsMinimumThreshold(data)

  const goStep = useCallback(
    async (next: number) => {
      const s = clampStep(next)
      setStep(s)
      await logCompanyTelemetryEvent(`onboarding_step_${s}`, { fromStep: step })
    },
    [step],
  )

  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!wizardMeetsMinimumThreshold(data)) {
        throw new Error('Complete the minimum fields before finishing.')
      }
      return completeWizardAndCreateCompany(data)
    },
    onSuccess: async (companyId) => {
      toast.success('Company workspace ready')
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['onboarding-draft'] })
      try {
        await invokeComputeHealthScore({ companyId })
      } catch {
        /* optional */
      }
      void navigate('/company', { replace: true })
    },
    onError: (e: unknown) => {
      if (e instanceof CompanyConflictError) {
        toast.error(e.message, { description: e.remediation })
        void navigate('/company', { replace: true })
        return
      }
      const msg = e instanceof Error ? e.message : 'Could not create company'
      toast.error(msg)
    },
  })

  const addProduct = () => {
    setData((prev) => ({
      ...prev,
      step2: { ...prev.step2, products_services: [...(prev.step2.products_services ?? []), ''] },
    }))
  }

  const setProduct = (i: number, v: string) => {
    setData((prev) => {
      const next = [...(prev.step2.products_services ?? [])]
      next[i] = v
      return { ...prev, step2: { ...prev.step2, products_services: next } }
    })
  }

  const removeProduct = (i: number) => {
    setData((prev) => {
      const next = [...(prev.step2.products_services ?? [])].filter((_, j) => j !== i)
      return { ...prev, step2: { ...prev.step2, products_services: next } }
    })
  }

  const addCompetitor = () => {
    setData((prev) => ({
      ...prev,
      step4: { ...prev.step4, competitors: [...(prev.step4.competitors ?? []), { name: '' }] },
    }))
  }

  const addChannel = () => {
    setData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        channels: [...(prev.step5.channels ?? []), { platform: '', followers: '', engagement: '' }],
      },
    }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in motion-reduce:animate-none">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Create your company</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Guided onboarding — drafts autosave. You need one company per account; finish when completeness meets the
          minimum bar.
        </p>
      </div>

      {draftQuery.data?.lastSavedAt ? (
        <p className="text-xs text-muted-foreground" role="status">
          Resumed saved draft · last saved{' '}
          {new Date(draftQuery.data.lastSavedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2" aria-label="Onboarding steps">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const active = step === n
            return (
              <button
                key={label}
                type="button"
                onClick={() => void goStep(n)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-200 md:text-sm',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {n}. {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground">Data completeness</span>
          <span className="text-sm tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        {!canFinish ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Complete required slices (profile, financial signal, market context, web or channel signal) to enable
            finish.
          </p>
        ) : (
          <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Minimum threshold met — you can finish onboarding.
          </p>
        )}
      </div>

      <Card className="border-border/80 p-6 shadow-card md:p-8">
        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic metadata</h2>
            <div className="space-y-2">
              <Label htmlFor="co-name">Company name</Label>
              <Input
                id="co-name"
                value={data.step1.name}
                onChange={(e) => setData((p) => ({ ...p, step1: { ...p.step1, name: e.target.value } }))}
                placeholder="Acme Co."
                className="rounded-lg border-border"
                required
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-web">Website (optional)</Label>
              <Input
                id="co-web"
                value={data.step1.website}
                onChange={(e) => setData((p) => ({ ...p, step1: { ...p.step1, website: e.target.value } }))}
                placeholder="https://"
                inputMode="url"
                className="rounded-lg border-border"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ind">Industry</Label>
                <Input
                  id="ind"
                  value={data.step2.industry}
                  onChange={(e) => setData((p) => ({ ...p, step2: { ...p.step2, industry: e.target.value } }))}
                  className="rounded-lg border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bm">Business model</Label>
                <Input
                  id="bm"
                  value={data.step2.business_model}
                  onChange={(e) => setData((p) => ({ ...p, step2: { ...p.step2, business_model: e.target.value } }))}
                  placeholder="B2B SaaS, marketplace…"
                  className="rounded-lg border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Products / services</Label>
              <p className="text-xs text-muted-foreground">Add at least one line.</p>
              <ul className="space-y-2">
                {(data.step2.products_services ?? []).length === 0 ? (
                  <li className="text-sm text-muted-foreground">No lines yet — add one below.</li>
                ) : null}
                {(data.step2.products_services ?? []).map((line, i) => (
                  <li key={`p-${i}`} className="flex gap-2">
                    <Input
                      value={line}
                      onChange={(e) => setProduct(i, e.target.value)}
                      className="rounded-lg border-border"
                      aria-label={`Product or service ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 p-0"
                      onClick={() => removeProduct(i)}
                      aria-label={`Remove line ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="secondary" className="h-9 gap-1 px-3 text-sm" onClick={addProduct}>
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc">Target customers</Label>
              <Textarea
                id="tc"
                value={data.step2.target_customers}
                onChange={(e) => setData((p) => ({ ...p, step2: { ...p.step2, target_customers: e.target.value } }))}
                className="min-h-[88px] rounded-lg border-border"
                placeholder="SMB owners in healthcare, etc."
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Financials</h2>
            <p className="text-sm text-muted-foreground">Enter at least revenue or expenses (annual or TTM).</p>
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ['revenue', 'Revenue', data.step3.revenue],
                  ['expenses', 'Expenses', data.step3.expenses],
                  ['profit_margin_pct', 'Profit margin %', data.step3.profit_margin_pct],
                  ['cash', 'Cash on hand', data.step3.cash],
                  ['debt', 'Debt', data.step3.debt],
                  ['cac', 'CAC (optional)', data.step3.cac],
                  ['ltv', 'LTV (optional)', data.step3.ltv],
                ] as const
              ).map(([key, label, val]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    inputMode="decimal"
                    value={val}
                    onChange={(e) =>
                      setData((p) => ({ ...p, step3: { ...p.step3, [key]: e.target.value } as typeof p.step3 }))
                    }
                    className="rounded-lg border-border"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Market</h2>
            <p className="text-sm text-muted-foreground">Add competitors, trends, or segment notes.</p>
            <div className="space-y-2">
              <Label>Competitors</Label>
              {(data.step4.competitors ?? []).map((c, i) => (
                <Input
                  key={`comp-${i}`}
                  value={c.name}
                  onChange={(e) =>
                    setData((p) => {
                      const next = [...(p.step4.competitors ?? [])]
                      next[i] = { name: e.target.value }
                      return { ...p, step4: { ...p.step4, competitors: next } }
                    })
                  }
                  placeholder="Competitor name"
                  className="rounded-lg border-border"
                />
              ))}
              <Button type="button" variant="secondary" className="h-9 gap-1 px-3 text-sm" onClick={addCompetitor}>
                <Plus className="h-4 w-4" />
                Add competitor
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm">Pricing / positioning notes</Label>
              <Textarea
                id="pm"
                value={data.step4.pricing_note}
                onChange={(e) => setData((p) => ({ ...p, step4: { ...p.step4, pricing_note: e.target.value } }))}
                className="rounded-lg border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tr">Trends (one per line)</Label>
              <Textarea
                id="tr"
                value={(data.step4.trends ?? []).join('\n')}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    step4: {
                      ...p.step4,
                      trends: e.target.value
                        .split('\n')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                className="rounded-lg border-border"
                placeholder="AI adoption\nRegulatory shifts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seg">Market segments</Label>
              <Input
                id="seg"
                value={data.step4.market_segments}
                onChange={(e) => setData((p) => ({ ...p, step4: { ...p.step4, market_segments: e.target.value } }))}
                className="rounded-lg border-border"
              />
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Social & brand</h2>
            <p className="text-sm text-muted-foreground">Website traffic and/or at least one channel.</p>
            <div className="space-y-2">
              <Label htmlFor="wt">Website traffic (monthly sessions or visits)</Label>
              <Input
                id="wt"
                inputMode="numeric"
                value={data.step5.website_traffic}
                onChange={(e) => setData((p) => ({ ...p, step5: { ...p.step5, website_traffic: e.target.value } }))}
                className="rounded-lg border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf">Posting frequency (approx. posts / month)</Label>
              <Input
                id="pf"
                inputMode="numeric"
                value={data.step5.posting_frequency}
                onChange={(e) => setData((p) => ({ ...p, step5: { ...p.step5, posting_frequency: e.target.value } }))}
                className="rounded-lg border-border"
              />
            </div>
            <div className="space-y-3">
              <Label>Channels</Label>
              {(data.step5.channels ?? []).map((ch, i) => (
                <div key={`ch-${i}`} className="grid gap-2 rounded-lg border border-border/80 p-3 md:grid-cols-3">
                  <Input
                    placeholder="Platform"
                    value={ch.platform}
                    onChange={(e) =>
                      setData((p) => {
                        const next = [...(p.step5.channels ?? [])]
                        next[i] = { ...next[i], platform: e.target.value }
                        return { ...p, step5: { ...p.step5, channels: next } }
                      })
                    }
                    className="rounded-lg border-border"
                  />
                  <Input
                    placeholder="Followers"
                    inputMode="numeric"
                    value={ch.followers}
                    onChange={(e) =>
                      setData((p) => {
                        const next = [...(p.step5.channels ?? [])]
                        next[i] = { ...next[i], followers: e.target.value }
                        return { ...p, step5: { ...p.step5, channels: next } }
                      })
                    }
                    className="rounded-lg border-border"
                  />
                  <Input
                    placeholder="Engagement %"
                    inputMode="decimal"
                    value={ch.engagement}
                    onChange={(e) =>
                      setData((p) => {
                        const next = [...(p.step5.channels ?? [])]
                        next[i] = { ...next[i], engagement: e.target.value }
                        return { ...p, step5: { ...p.step5, channels: next } }
                      })
                    }
                    className="rounded-lg border-border"
                  />
                </div>
              ))}
              <Button type="button" variant="secondary" className="h-9 gap-1 px-3 text-sm" onClick={addChannel}>
                <Plus className="h-4 w-4" />
                Add channel
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] gap-1"
            disabled={step <= 1}
            onClick={() => void goStep(step - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 5 ? (
            <Button
              type="button"
              variant="primary"
              className="min-h-[44px] gap-1 transition-transform duration-200 hover:scale-[1.02]"
              onClick={() => void goStep(step + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="min-h-[44px] transition-transform duration-200 hover:scale-[1.02]"
              disabled={!canFinish || finishMutation.isPending}
              onClick={() => finishMutation.mutate()}
            >
              {finishMutation.isPending ? 'Creating…' : 'Finish & open workspace'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
