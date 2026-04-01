import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { fireAndForgetInvalidateCompanyCache } from '@/lib/pulse-cache-api'
import type { CompanyRow } from '@/types/integrations'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type FinancialsRow = Database['public']['Tables']['company_financials']['Row']
type MarketRow = Database['public']['Tables']['company_market_data']['Row']
type SocialRow = Database['public']['Tables']['company_social']['Row']

const profileSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  stage: z.string().optional(),
  website: z.string().optional(),
  business_model: z.string().optional(),
  target_customer: z.string().optional(),
  goals: z.string().optional(),
  products: z.string().optional(),
})

const financialSchema = z.object({
  revenue: z.string().optional(),
  expenses: z.string().optional(),
  profit: z.string().optional(),
  cash: z.string().optional(),
  debt: z.string().optional(),
})

const marketSchema = z.object({
  competitors: z.string().optional(),
  trends: z.string().optional(),
})

const socialSchema = z.object({
  followers: z.string().optional(),
  engagement_rate: z.string().optional(),
  posts_count: z.string().optional(),
  website_traffic: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>
type FinancialValues = z.infer<typeof financialSchema>
type MarketValues = z.infer<typeof marketSchema>
type SocialValues = z.infer<typeof socialSchema>

function parseOptNum(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function parseLines(s: string | undefined): string[] {
  const t = (s ?? '').trim()
  if (!t) return []
  return t
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

export interface CompanyWorkspaceFormsProps {
  companyId: string
  company: CompanyRow
  financials: FinancialsRow | null
  market: MarketRow | null
  social: SocialRow | null
  className?: string
}

export function CompanyWorkspaceForms({
  companyId,
  company,
  financials,
  market,
  social,
  className,
}: CompanyWorkspaceFormsProps) {
  const queryClient = useQueryClient()

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: company.name ?? '',
      industry: company.industry ?? '',
      stage: company.stage ?? '',
      website: company.website ?? '',
      business_model: company.business_model ?? '',
      target_customer: company.target_customer ?? '',
      goals: company.goals ?? '',
      products: company.products ?? '',
    },
  })

  useEffect(() => {
    profileForm.reset({
      name: company.name ?? '',
      industry: company.industry ?? '',
      stage: company.stage ?? '',
      website: company.website ?? '',
      business_model: company.business_model ?? '',
      target_customer: company.target_customer ?? '',
      goals: company.goals ?? '',
      products: company.products ?? '',
    })
  }, [company, profileForm])

  const finForm = useForm<FinancialValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      revenue: financials?.revenue != null ? String(financials.revenue) : '',
      expenses: financials?.expenses != null ? String(financials.expenses) : '',
      profit: financials?.profit != null ? String(financials.profit) : '',
      cash: financials?.cash != null ? String(financials.cash) : '',
      debt: financials?.debt != null ? String(financials.debt) : '',
    },
  })

  useEffect(() => {
    finForm.reset({
      revenue: financials?.revenue != null ? String(financials.revenue) : '',
      expenses: financials?.expenses != null ? String(financials.expenses) : '',
      profit: financials?.profit != null ? String(financials.profit) : '',
      cash: financials?.cash != null ? String(financials.cash) : '',
      debt: financials?.debt != null ? String(financials.debt) : '',
    })
  }, [financials, finForm])

  const competitorsLines = Array.isArray(market?.competitors)
    ? (market?.competitors as unknown[])
        .map((c) => (typeof c === 'string' ? c : JSON.stringify(c)))
        .join('\n')
    : ''
  const trendsLines = Array.isArray(market?.trends)
    ? (market?.trends as unknown[]).map((c) => (typeof c === 'string' ? c : String(c))).join('\n')
    : ''

  const marketForm = useForm<MarketValues>({
    resolver: zodResolver(marketSchema),
    defaultValues: {
      competitors: competitorsLines,
      trends: trendsLines,
    },
  })

  useEffect(() => {
    const comp = Array.isArray(market?.competitors)
      ? (market?.competitors as unknown[])
          .map((c) => (typeof c === 'string' ? c : JSON.stringify(c)))
          .join('\n')
      : ''
    const tr = Array.isArray(market?.trends)
      ? (market?.trends as unknown[]).map((c) => (typeof c === 'string' ? c : String(c))).join('\n')
      : ''
    marketForm.reset({ competitors: comp, trends: tr })
  }, [market, marketForm])

  const socialForm = useForm<SocialValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      followers: social?.followers != null ? String(social.followers) : '',
      engagement_rate: social?.engagement_rate != null ? String(social.engagement_rate) : '',
      posts_count: social?.posts_count != null ? String(social.posts_count) : '',
      website_traffic: social?.website_traffic != null ? String(social.website_traffic) : '',
    },
  })

  useEffect(() => {
    socialForm.reset({
      followers: social?.followers != null ? String(social.followers) : '',
      engagement_rate: social?.engagement_rate != null ? String(social.engagement_rate) : '',
      posts_count: social?.posts_count != null ? String(social.posts_count) : '',
      website_traffic: social?.website_traffic != null ? String(social.website_traffic) : '',
    })
  }, [social, socialForm])

  const saveProfile = useMutation({
    mutationFn: async (values: ProfileValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          industry: values.industry || null,
          stage: values.stage || null,
          website: values.website || null,
          business_model: values.business_model || null,
          target_customer: values.target_customer || null,
          goals: values.goals || null,
          products: values.products || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Profile saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  const saveFinancials = useMutation({
    mutationFn: async (values: FinancialValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase.from('company_financials').upsert(
        {
          company_id: companyId,
          revenue: parseOptNum(values.revenue),
          expenses: parseOptNum(values.expenses),
          profit: parseOptNum(values.profit),
          cash: parseOptNum(values.cash),
          debt: parseOptNum(values.debt),
          per_month_metrics: Array.isArray(financials?.per_month_metrics) ? financials.per_month_metrics : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Financials saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  const saveMarket = useMutation({
    mutationFn: async (values: MarketValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const competitors = parseLines(values.competitors).map((name) => ({ name }))
      const trends = parseLines(values.trends)
      const { error } = await supabase.from('company_market_data').upsert(
        {
          company_id: companyId,
          competitors,
          pricing_matrix: market?.pricing_matrix ?? [],
          trends,
          opportunities: market?.opportunities ?? [],
          threats: market?.threats ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Market data saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  const saveSocial = useMutation({
    mutationFn: async (values: SocialValues) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const followers = parseOptNum(values.followers)
      const engagement = parseOptNum(values.engagement_rate)
      const posts = parseOptNum(values.posts_count)
      const traffic = parseOptNum(values.website_traffic)
      const { error } = await supabase.from('company_social').upsert(
        {
          company_id: companyId,
          followers: followers != null ? Math.round(followers) : null,
          engagement_rate: engagement,
          posts_count: posts != null ? Math.round(posts) : null,
          website_traffic: traffic != null ? Math.round(traffic) : null,
          brand_mentions: social?.brand_mentions ?? [],
          post_metrics: social?.post_metrics ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success('Social & brand saved')
      fireAndForgetInvalidateCompanyCache(companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })

  return (
    <div className={cn('space-y-6', className)}>
      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-base font-semibold">Profile</h3>
        <p className="mb-4 text-sm text-muted-foreground">Required for quality AI output: name and industry.</p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={profileForm.handleSubmit((v) => void saveProfile.mutateAsync(v))}
          noValidate
        >
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cw-name">Company name *</Label>
            <Input id="cw-name" className="rounded-lg" {...profileForm.register('name')} aria-invalid={Boolean(profileForm.formState.errors.name)} />
            {profileForm.formState.errors.name ? (
              <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-industry">Industry</Label>
            <Input id="cw-industry" className="rounded-lg" {...profileForm.register('industry')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-stage">Stage</Label>
            <Input id="cw-stage" className="rounded-lg" {...profileForm.register('stage')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cw-website">Website</Label>
            <Input id="cw-website" className="rounded-lg" placeholder="https://…" {...profileForm.register('website')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cw-bm">Business model</Label>
            <Textarea id="cw-bm" className="min-h-[72px] rounded-lg" {...profileForm.register('business_model')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cw-products">Products / services</Label>
            <Textarea id="cw-products" className="min-h-[72px] rounded-lg" {...profileForm.register('products')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cw-tc">Target customer</Label>
            <Textarea id="cw-tc" className="min-h-[72px] rounded-lg" {...profileForm.register('target_customer')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cw-goals">Goals</Label>
            <Textarea id="cw-goals" className="min-h-[72px] rounded-lg" {...profileForm.register('goals')} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" disabled={saveProfile.isPending} className="min-h-[44px]">
              {saveProfile.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-base font-semibold">Financials</h3>
        <p className="mb-4 text-sm text-muted-foreground">Monthly or TTM figures; used by the scoring engine.</p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={finForm.handleSubmit((v) => void saveFinancials.mutateAsync(v))}
          noValidate
        >
          {(['revenue', 'expenses', 'profit', 'cash', 'debt'] as const).map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={`cw-fin-${field}`} className="capitalize">
                {field}
              </Label>
              <Input id={`cw-fin-${field}`} className="rounded-lg" inputMode="decimal" {...finForm.register(field)} />
            </div>
          ))}
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" disabled={saveFinancials.isPending} className="min-h-[44px]">
              {saveFinancials.isPending ? 'Saving…' : 'Save financials'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-base font-semibold">Market</h3>
        <p className="mb-4 text-sm text-muted-foreground">One competitor per line; one trend per line.</p>
        <form className="space-y-4" onSubmit={marketForm.handleSubmit((v) => void saveMarket.mutateAsync(v))} noValidate>
          <div className="space-y-2">
            <Label htmlFor="cw-comp">Competitors</Label>
            <Textarea id="cw-comp" className="min-h-[100px] rounded-lg font-mono text-sm" {...marketForm.register('competitors')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-trends">Market trends</Label>
            <Textarea id="cw-trends" className="min-h-[100px] rounded-lg font-mono text-sm" {...marketForm.register('trends')} />
          </div>
          <Button type="submit" variant="primary" disabled={saveMarket.isPending} className="min-h-[44px]">
            {saveMarket.isPending ? 'Saving…' : 'Save market data'}
          </Button>
        </form>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-base font-semibold">Social & brand</h3>
        <p className="mb-4 text-sm text-muted-foreground">Engagement rate as decimal (e.g. 0.04 for 4%).</p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={socialForm.handleSubmit((v) => void saveSocial.mutateAsync(v))}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="cw-followers">Followers</Label>
            <Input id="cw-followers" className="rounded-lg" inputMode="numeric" {...socialForm.register('followers')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-eng">Engagement rate</Label>
            <Input id="cw-eng" className="rounded-lg" inputMode="decimal" {...socialForm.register('engagement_rate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-posts">Posts count</Label>
            <Input id="cw-posts" className="rounded-lg" inputMode="numeric" {...socialForm.register('posts_count')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-traffic">Website traffic</Label>
            <Input id="cw-traffic" className="rounded-lg" inputMode="numeric" {...socialForm.register('website_traffic')} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" disabled={saveSocial.isPending} className="min-h-[44px]">
              {saveSocial.isPending ? 'Saving…' : 'Save social & brand'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
