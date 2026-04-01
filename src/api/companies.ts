/**
 * Company CRUD, onboarding drafts, and telemetry — Supabase client + `pulse-companies-api` Edge Function helpers.
 */
import { supabase } from '@/lib/supabase'
import type { OnboardingWizardData } from '@/types/company-wizard'
import { parseWizardDataFromUnknown } from '@/lib/onboarding-wizard-parse'
import type { Database } from '@/types/database'
import { invokePulseCompaniesApi } from '@/lib/supabase-functions'

export class CompanyConflictError extends Error {
  readonly code = 'COMPANY_ALREADY_EXISTS' as const
  readonly status = 409
  remediation: string
  existingCompanyId?: string

  constructor(message: string, remediation: string, existingCompanyId?: string) {
    super(message)
    this.name = 'CompanyConflictError'
    this.remediation = remediation
    this.existingCompanyId = existingCompanyId
  }
}

function parseOptNum(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export async function logCompanyTelemetryEvent(
  action: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('user_activity_logs').insert({
    user_id: user.id,
    action,
    metadata: { ...metadata, source: 'companies_api' },
  })
  const { error: telErr } = await supabase.from('telemetry_events').insert({
    user_id: user.id,
    event_type: action,
    payload: { ...metadata, source: 'companies_api' },
  })
  if (telErr) {
    /* Optional until `telemetry_events` migration is applied */
  }
}

export async function getOnboardingDraft(): Promise<{
  step: number
  data: OnboardingWizardData
  lastSavedAt: string | null
} | null> {
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('onboarding_drafts').select('*').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const row = data as Database['public']['Tables']['onboarding_drafts']['Row']
  const parsed = parseWizardDataFromUnknown(row.data)
  return {
    step: typeof row.step === 'number' && row.step >= 1 && row.step <= 5 ? row.step : 1,
    data: parsed,
    lastSavedAt: row.last_saved_at ?? null,
  }
}

export async function upsertOnboardingDraft(step: number, data: OnboardingWizardData): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const payload = {
    user_id: user.id,
    step,
    data: data as unknown as Record<string, unknown>,
    last_saved_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('onboarding_drafts').upsert(payload, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  await logCompanyTelemetryEvent('draft_saved', { step })
}

export async function clearOnboardingDraft(): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('onboarding_drafts').delete().eq('user_id', user.id)
}

export async function assertNoExistingCompany(): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  if (data && typeof (data as { id?: string }).id === 'string') {
    throw new CompanyConflictError(
      'You already have a company on this account.',
      'Use the company workspace to edit your profile and data.',
      (data as { id: string }).id,
    )
  }
}

export async function completeWizardAndCreateCompany(wizard: OnboardingWizardData): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in required')

  const { data: existing } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  if (existing && typeof (existing as { id?: string }).id === 'string') {
    throw new CompanyConflictError(
      'Only one company is allowed per user.',
      'Open your company workspace or contact support for consolidation.',
      (existing as { id: string }).id,
    )
  }

  const productsServices = (wizard.step2.products_services ?? []).map((s) => s.trim()).filter(Boolean)
  const productsJoined = productsServices.length > 0 ? productsServices.join(', ') : null

  const { data: companyRow, error: cErr } = await supabase
    .from('companies')
    .insert({
      user_id: user.id,
      name: wizard.step1.name.trim(),
      website: wizard.step1.website.trim() || null,
      industry: wizard.step2.industry.trim() || null,
      business_model: wizard.step2.business_model.trim() || null,
      target_customer: wizard.step2.target_customers.trim() || null,
      target_customers: wizard.step2.target_customers.trim() || null,
      products: productsJoined,
      products_services: productsServices,
      onboarding_complete: true,
    })
    .select('id')
    .single()

  if (cErr) {
    if (cErr.code === '23505') {
      throw new CompanyConflictError(
        'A company already exists for this account.',
        'Refresh and open your company workspace.',
      )
    }
    throw new Error(cErr.message)
  }

  const companyId =
    companyRow && typeof (companyRow as { id?: string }).id === 'string'
      ? (companyRow as { id: string }).id
      : ''
  if (!companyId) throw new Error('Company create returned no id')

  const revenue = parseOptNum(wizard.step3.revenue)
  const expenses = parseOptNum(wizard.step3.expenses)
  const profit = parseOptNum(wizard.step3.profit_margin_pct)
  const cash = parseOptNum(wizard.step3.cash)
  const debt = parseOptNum(wizard.step3.debt)

  const { error: fErr } = await supabase.from('company_financials').upsert({
    company_id: companyId,
    revenue,
    expenses,
    profit,
    cash,
    debt,
    updated_at: new Date().toISOString(),
  })
  if (fErr) throw new Error(fErr.message)

  const competitors = (wizard.step4.competitors ?? []).map((c) => ({ name: c.name }))
  const trends = (wizard.step4.trends ?? []).map((t) => t)

  const { error: mErr } = await supabase.from('company_market_data').upsert({
    company_id: companyId,
    competitors,
    pricing_matrix: wizard.step4.pricing_note.trim()
      ? [{ note: wizard.step4.pricing_note.trim() }]
      : [],
    trends,
    opportunities: wizard.step4.market_segments.trim()
      ? [{ label: wizard.step4.market_segments.trim(), priority: 'medium' }]
      : [],
    threats: [],
    updated_at: new Date().toISOString(),
  })
  if (mErr) throw new Error(mErr.message)

  const ch0 = wizard.step5.channels?.[0]
  const followers = parseOptNum(ch0?.followers)
  const engagement = parseOptNum(ch0?.engagement)
  const websiteTraffic = parseOptNum(wizard.step5.website_traffic)

  const { error: sErr } = await supabase.from('company_social').upsert({
    company_id: companyId,
    followers,
    engagement_rate: engagement,
    posts_count: parseOptNum(wizard.step5.posting_frequency),
    website_traffic: websiteTraffic,
    post_metrics: (wizard.step5.channels ?? []).map((c) => ({
      platform: c.platform,
      followers: parseOptNum(c.followers),
      engagement: parseOptNum(c.engagement),
    })),
    updated_at: new Date().toISOString(),
  })
  if (sErr) throw new Error(sErr.message)

  await clearOnboardingDraft()
  await logCompanyTelemetryEvent('company_created', { companyId })

  await supabase.from('analysis_history').insert({
    company_id: companyId,
    summary: 'Workspace initialized — run Generate analysis for your first AI report.',
    details: { kind: 'onboarding_complete' },
  })

  return companyId
}

export async function deleteMyCompany(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in required')
  const { data: row } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  const id = row && typeof (row as { id?: string }).id === 'string' ? (row as { id: string }).id : null
  if (!id) return
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logCompanyTelemetryEvent('company_deleted', { companyId: id })
}

export async function fetchMyTelemetryEvents(limit = 50): Promise<
  { id: string; action: string; createdAt: string; metadata: Record<string, unknown> }[]
> {
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('user_activity_logs')
    .select('id, action, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(Math.min(200, Math.max(1, limit)))
  if (error) throw new Error(error.message)
  const rows = data ?? []
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    const rec = r as Record<string, unknown>
    const meta = rec.metadata
    return {
      id: typeof rec.id === 'string' ? rec.id : String(rec.id ?? ''),
      action: typeof rec.action === 'string' ? rec.action : '',
      createdAt: typeof rec.created_at === 'string' ? rec.created_at : '',
      metadata:
        meta !== null && typeof meta === 'object' && !Array.isArray(meta)
          ? (meta as Record<string, unknown>)
          : {},
    }
  })
}

/** Create via `pulse-companies-api` Edge Function (structured 409 / validation). */
export async function createCompanyViaEdgeFunction(payload: {
  name: string
  industry?: string
  website?: string
  business_model?: string
  target_customers?: string
  products_services?: string[]
}): Promise<{ companyId: string | null }> {
  try {
    const res = await invokePulseCompaniesApi<{ data: { company: { id: string } } }>({
      op: 'create',
      name: payload.name,
      industry: payload.industry ?? '',
      website: payload.website ?? '',
      business_model: payload.business_model ?? '',
      target_customers: payload.target_customers ?? '',
      products_services: Array.isArray(payload.products_services) ? payload.products_services : [],
    })
    const id = res?.data?.company?.id
    return { companyId: typeof id === 'string' ? id : null }
  } catch (e) {
    const err = e as Error & { status?: number; code?: string }
    if (err.status === 409 || err.code === 'COMPANY_ALREADY_EXISTS') {
      throw new CompanyConflictError(
        err.message || 'A company already exists for this account.',
        (err as { remediation?: string }).remediation ?? 'Open your company workspace.',
      )
    }
    throw e
  }
}
