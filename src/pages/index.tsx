import { z } from 'zod'
import { PageTemplate } from '@/components/layout/page-template'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DashboardPage } from '@/pages/dashboard-page'
import { CompanyDetailPage } from '@/pages/company-detail-page'
import { SettingsPage } from '@/pages/settings-page'

export { DashboardPage, CompanyDetailPage, SettingsPage }
export { GenerateAnalysisPage } from '@/pages/generate-analysis-page'
export { ReportViewerPage } from '@/pages/report-viewer-page'

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

export const CreateCompanyPage = () => (
  <PageTemplate title="Create company wizard" description="Profile -> Financials -> Market -> Social -> Review with autosave." />
)

export const FinancialsPage = () => (
  <PageTemplate title="Financials form" description="Revenue, expenses, margin, cash, debt, CAC/LTV, concentration, and uploads." />
)
export const MarketDataPage = () => (
  <PageTemplate title="Market data form" description="Competitor matrix, trends, opportunities, and threats with priorities." />
)
export const SocialBrandPage = () => (
  <PageTemplate title="Social & brand form" description="Channel metrics, engagement cadence, website traffic, and ratings." />
)

export const ExportSettingsPage = () => (
  <PageTemplate title="Export and PDF settings" description="Configure section visibility, branding options, and export orientation." />
)
export const UserProfilePage = () => (
  <PageTemplate title="User profile" description="Profile, security settings, subscription summary, and recent activity." />
)

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
