import { type ReactNode, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from 'lucide-react'
import { PageTemplate } from '@/components/layout/page-template'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { HealthTrendChart } from '@/components/charts/health-trend-chart'
import {
  useCompanyDetailData,
  useConnectIntegration,
  useDashboardData,
  useIntegrationConnections,
  useTriggerSync,
} from '@/hooks/use-integrations'
import type {
  IntegrationConnection,
  IntegrationProvider,
  SyncHistoryItem,
} from '@/types/integrations'

const defaultConnections: IntegrationConnection[] = [
  { id: 'ga4', provider: 'ga4', status: 'disconnected', scopes: ['analytics.readonly'], cadence: 'daily', lastSyncedAt: null, nextSyncAt: null, updatedAt: new Date().toISOString() },
  { id: 'quickbooks', provider: 'quickbooks', status: 'disconnected', scopes: ['com.intuit.quickbooks.accounting'], cadence: 'daily', lastSyncedAt: null, nextSyncAt: null, updatedAt: new Date().toISOString() },
  { id: 'linkedin', provider: 'linkedin', status: 'disconnected', scopes: ['r_organization_social', 'r_organization_admin'], cadence: 'daily', lastSyncedAt: null, nextSyncAt: null, updatedAt: new Date().toISOString() },
  { id: 'stripe', provider: 'stripe', status: 'disconnected', scopes: ['read_only'], cadence: 'manual', lastSyncedAt: null, nextSyncAt: null, updatedAt: new Date().toISOString() },
  { id: 'csv', provider: 'csv', status: 'connected', scopes: ['upload:write'], cadence: 'manual', lastSyncedAt: null, nextSyncAt: null, updatedAt: new Date().toISOString() },
]

function sectionCard(title: string, text: string) {
  return (
    <Card className="animate-fade-in">
      <h3 className="mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  )
}

export function LandingPage() {
  return (
    <PageTemplate
      title="Objective company health analysis in minutes"
      description="PulseBoard turns fragmented business data into SWOT insights, risk detection, and prioritized action plans."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {sectionCard('Feature Cards', 'Financial, market, social, and benchmark-ready analysis in one workflow.')}
        {sectionCard('How It Works', 'Collect inputs, run analysis job, edit results, and export a client-ready PDF.')}
        {sectionCard('Pricing Teaser', 'Starter for founders, Pro for consultants, and Admin tooling for teams.')}
      </div>
      <Button>Get started</Button>
    </PageTemplate>
  )
}

export function SignupPage() {
  return (
    <PageTemplate title="Create account" description="Email/password signup with role, plan, and consent capture.">
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Email" />
        <Input placeholder="Company name (optional)" />
      </div>
      <Button>Create account</Button>
    </PageTemplate>
  )
}

export const EmailVerificationPage = () => (
  <PageTemplate title="Verify your email" description="Check your inbox, then continue onboarding your company profile." />
)

export const LoginPage = () => (
  <PageTemplate title="Welcome back" description="Secure login with password reset and future social SSO support." />
)

export function DashboardPage() {
  const { data, isLoading } = useDashboardData()
  const payload = data ?? {
    hasCompany: false,
    companyName: null,
    healthScore: 0,
    completeness: 0,
    staleSignals: [],
    latestAnalyses: [],
    integrations: [],
    syncHistory: [],
  }

  const latestAnalyses = Array.isArray(payload.latestAnalyses) ? payload.latestAnalyses : []
  const staleSignals = Array.isArray(payload.staleSignals) ? payload.staleSignals : []
  const syncHistory = Array.isArray(payload.syncHistory) ? payload.syncHistory : []

  return (
    <PageTemplate title="Dashboard" description="Single-company workspace with health score, latest analysis, and quick actions.">
      {!payload.hasCompany ? (
        <Card className="space-y-3 border-dashed">
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            <p className="font-medium">No company detected yet</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Start with the guided setup wizard to unlock health scoring, integrations, and AI analysis.
          </p>
          <Button>Create company</Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall health score</p>
            <p className="text-3xl font-semibold">{payload.healthScore}/100</p>
            <p className="text-sm text-muted-foreground">Company: {payload.companyName ?? 'Unknown'}</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Data completeness</p>
            <Progress value={payload.completeness} />
            <p className="text-sm text-muted-foreground">{payload.completeness}% complete</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Stale signals</p>
            {(staleSignals ?? []).length === 0 ? (
              <p className="text-sm text-accent">All signals are fresh.</p>
            ) : (
              <ul className="space-y-1 text-sm text-warning">
                {(staleSignals ?? []).map((signal) => (
                  <li key={signal}>- {signal}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          {isLoading ? <Card className="h-[300px] animate-pulse bg-muted" /> : <HealthTrendChart />}
        </div>
        <Card className="space-y-3 xl:col-span-2">
          <h3>Latest analyses</h3>
          {(latestAnalyses ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Run your first analysis to populate this panel.</p>
          ) : (
            <div className="space-y-2">
              {(latestAnalyses ?? []).map((analysis) => (
                <div key={analysis.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{analysis.title}</p>
                  <p className="text-muted-foreground">{new Date(analysis.createdAt).toLocaleDateString()}</p>
                  <p className="text-primary">Score: {analysis.score}</p>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full">Run analysis</Button>
        </Card>
      </div>
      <SyncHistoryPanel syncHistory={syncHistory} />
    </PageTemplate>
  )
}

export const CreateCompanyPage = () => (
  <PageTemplate title="Create company wizard" description="Profile -> Financials -> Market -> Social -> Review with autosave." />
)
export function CompanyDetailPage() {
  const { data, isLoading } = useCompanyDetailData()
  const detail = data ?? {
    id: 'draft',
    name: 'PulseBoard Company',
    industry: null,
    website: null,
    goals: null,
    healthBreakdown: { financial: 0, market: 0, social: 0 },
    lastUpdatedAt: null,
    financials: [],
    market: [],
    social: [],
  }
  const financialRows = Array.isArray(detail.financials) ? detail.financials : []
  const marketRows = Array.isArray(detail.market) ? detail.market : []
  const socialRows = Array.isArray(detail.social) ? detail.social : []

  return (
    <PageTemplate title="Company detail" description="Persistent workspace with overview, forms, reports, and activity tabs.">
      <Card className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Company</p>
          <h3>{detail.name}</h3>
          <p className="text-sm text-muted-foreground">{detail.industry ?? 'Industry not set'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Last updated</p>
          <p className="text-sm">{detail.lastUpdatedAt ? new Date(detail.lastUpdatedAt).toLocaleString() : 'No updates yet'}</p>
          <p className="text-sm text-muted-foreground">{detail.website ?? 'Website missing'}</p>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs text-muted-foreground">Financial</p>
          <p className="text-2xl font-semibold">{detail.healthBreakdown.financial}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Market</p>
          <p className="text-2xl font-semibold">{detail.healthBreakdown.market}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Social</p>
          <p className="text-2xl font-semibold">{detail.healthBreakdown.social}</p>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <EditableFormCard
          title="Financials"
          helperText="Autosaved numeric inputs with nullable-safe fallbacks."
          rows={(financialRows ?? []).map((row) => ({
            key: row.label,
            label: row.label,
            value: row.value === null ? '' : String(row.value),
          }))}
        />
        <Card className="space-y-3">
          <h3>Market signals</h3>
          {(marketRows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No market data available yet.</p>
          ) : (
            (marketRows ?? []).map((row) => (
              <div key={`${row.competitor}-${row.threatLevel}`} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{row.competitor}</p>
                <p className="text-warning">Threat: {row.threatLevel}</p>
                <p className="text-muted-foreground">{row.opportunity}</p>
              </div>
            ))
          )}
        </Card>
        <Card className="space-y-3">
          <h3>Social channels</h3>
          {(socialRows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Connect LinkedIn or upload CSV to populate this section.</p>
          ) : (
            (socialRows ?? []).map((row) => (
              <div key={row.channel} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{row.channel}</p>
                <p>Followers: {row.followers ?? 0}</p>
                <p>Engagement: {row.engagementRate ?? 0}%</p>
              </div>
            ))
          )}
        </Card>
      </div>
      {isLoading ? <Card className="h-20 animate-pulse bg-muted" /> : null}
    </PageTemplate>
  )
}
export const FinancialsPage = () => (
  <PageTemplate title="Financials form" description="Revenue, expenses, margin, cash, debt, CAC/LTV, concentration, and uploads." />
)
export const MarketDataPage = () => (
  <PageTemplate title="Market data form" description="Competitor matrix, trends, opportunities, and threats with priorities." />
)
export const SocialBrandPage = () => (
  <PageTemplate title="Social & brand form" description="Channel metrics, engagement cadence, website traffic, and ratings." />
)
export const GenerateAnalysisPage = () => (
  <PageTemplate title="Generate analysis" description="Choose analysis depth, benchmark toggle, consent, and monitor job progress." />
)

export function ReportViewerPage() {
  const { id } = useParams()
  const reportId = useMemo(() => id ?? 'draft', [id])
  return (
    <PageTemplate title="Report viewer" description={`Editable executive report sections for record ${reportId}.`} />
  )
}

export const ExportSettingsPage = () => (
  <PageTemplate title="Export and PDF settings" description="Configure section visibility, branding options, and export orientation." />
)
export const UserProfilePage = () => (
  <PageTemplate title="User profile" description="Profile, security settings, subscription summary, and recent activity." />
)
export function SettingsPage() {
  const { data } = useIntegrationConnections()
  const connectMutation = useConnectIntegration()
  const syncMutation = useTriggerSync()
  const [filter, setFilter] = useState<IntegrationProvider | 'all'>('all')

  const safeConnections = ((Array.isArray(data) ? data : []) as IntegrationConnection[]) ?? []
  const hydratedConnections = safeConnections.length > 0 ? safeConnections : defaultConnections
  const visibleConnections =
    filter === 'all' ? hydratedConnections : (hydratedConnections ?? []).filter((row) => row.provider === filter)

  return (
    <PageTemplate title="Settings and preferences" description="Integrations center, notifications, team invites, and data controls.">
      <Card className="space-y-3">
        <h3>Integrations & connectors</h3>
        <p className="text-sm text-muted-foreground">
          Connect GA4, QuickBooks, LinkedIn, Stripe, and CSV pipelines with OAuth 2.0 and scheduled syncs.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'ga4', 'quickbooks', 'linkedin', 'stripe', 'csv'] as const).map((provider) => (
            <Button
              key={provider}
              variant={filter === provider ? 'primary' : 'secondary'}
              onClick={() => setFilter(provider)}
              className="capitalize"
            >
              {provider}
            </Button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(visibleConnections ?? []).map((connection) => (
          <ProviderCard
            key={connection.id}
            connection={connection}
            onConnect={() => connectMutation.mutate(connection.id)}
            onSync={() => syncMutation.mutate(connection.id)}
            isLoading={connectMutation.isPending || syncMutation.isPending}
          />
        ))}
      </div>
      {(visibleConnections ?? []).length === 0 ? (
        <Card className="text-sm text-muted-foreground">No connectors found for this filter.</Card>
      ) : null}
    </PageTemplate>
  )
}
export const AdminUsersPage = () => (
  <PageTemplate title="Admin user management" description="Filtered user table, suspend/reactivate actions, and migration controls." />
)
export const AdminDashboardPage = () => (
  <PageTemplate title="Admin dashboard" description="Operational metrics, queue visibility, and system error-rate monitoring." />
)
export const PasswordResetPage = () => (
  <PageTemplate title="Password reset" description="Request reset email and securely set a new password token flow." />
)

export function NotFoundPage() {
  return (
    <PageTemplate title="Page not found" description="This route does not exist in the current PulseBoard workspace.">
      <p className="text-sm text-muted-foreground">Validation sample: {z.string().safeParse('ok').success ? 'ready' : 'error'}</p>
    </PageTemplate>
  )
}

function ProviderCard({
  connection,
  onConnect,
  onSync,
  isLoading,
}: {
  connection: IntegrationConnection
  onConnect: () => void
  onSync: () => void
  isLoading: boolean
}) {
  const providerScopes = Array.isArray(connection.scopes) ? connection.scopes : []
  const statusStyles: Record<IntegrationConnection['status'], string> = {
    disconnected: 'text-muted-foreground',
    connected: 'text-accent',
    syncing: 'text-primary',
    error: 'text-red-600',
  }
  const statusIcon: Record<IntegrationConnection['status'], ReactNode> = {
    disconnected: <Unplug className="h-4 w-4" />,
    connected: <CheckCircle2 className="h-4 w-4" />,
    syncing: <RefreshCw className="h-4 w-4 animate-spin" />,
    error: <AlertCircle className="h-4 w-4" />,
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide">{connection.provider}</p>
        <span className={`inline-flex items-center gap-1 text-xs ${statusStyles[connection.status]}`}>
          {statusIcon[connection.status]}
          {connection.status}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>Cadence: {connection.cadence}</p>
        <p>Last synced: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : 'Never'}</p>
        <p>Next sync: {connection.nextSyncAt ? new Date(connection.nextSyncAt).toLocaleString() : 'Not scheduled'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(providerScopes ?? []).map((scope) => (
          <span key={scope} className="rounded-full border px-2 py-1 text-xs">
            {scope}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={onConnect} disabled={isLoading} className="flex-1">
          <Link2 className="mr-1 h-4 w-4" />
          Connect
        </Button>
        <Button onClick={onSync} disabled={isLoading} variant="secondary" className="flex-1">
          <RefreshCw className="mr-1 h-4 w-4" />
          Sync
        </Button>
      </div>
    </Card>
  )
}

function SyncHistoryPanel({ syncHistory }: { syncHistory: SyncHistoryItem[] }) {
  const safeHistory = Array.isArray(syncHistory) ? syncHistory : []
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-primary" />
        <h3>Sync history</h3>
      </div>
      {(safeHistory ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No sync jobs have run yet.</p>
      ) : (
        <div className="space-y-2">
          {(safeHistory ?? []).map((job) => (
            <div key={job.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium uppercase">{job.provider}</p>
              <p>Status: {job.status}</p>
              <p>Records synced: {job.recordsSynced ?? 0}</p>
              <p className="text-muted-foreground">{job.errorMessage ?? 'No errors'}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function EditableFormCard({
  title,
  helperText,
  rows,
}: {
  title: string
  helperText: string
  rows: Array<{ key: string; label: string; value: string }>
}) {
  const [values, setValues] = useState<Array<{ key: string; label: string; value: string }>>(rows ?? [])
  const safeValues = Array.isArray(values) ? values : []

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3>{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
      {(safeValues ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows yet.</p>
      ) : (
        (safeValues ?? []).map((row) => (
          <label key={row.key} className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <Input
              value={row.value}
              onChange={(event) => {
                const nextValues = (safeValues ?? []).map((entry) =>
                  entry.key === row.key ? { ...entry, value: event.target.value } : entry,
                )
                setValues(nextValues)
              }}
            />
          </label>
        ))
      )}
      <Button variant="secondary">Save snapshot</Button>
    </Card>
  )
}
