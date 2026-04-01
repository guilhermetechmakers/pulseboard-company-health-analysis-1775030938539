import { z } from 'zod'
import { Link } from 'react-router-dom'
import { PageTemplate } from '@/components/layout/page-template'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardPage } from '@/pages/dashboard-page'
import { CompanyDetailPage } from '@/pages/company-detail-page'
import { SettingsPage } from '@/pages/settings-page'

export { DashboardPage, CompanyDetailPage, SettingsPage }
export { GenerateAnalysisPage } from '@/pages/generate-analysis-page'
export { ReportViewerPage } from '@/pages/report-viewer-page'
export { ExportSettingsPage } from '@/pages/export-settings-page'
export { LoginPage } from '@/pages/login-page'
export { SignupPage } from '@/pages/signup-page'
export { VerifyEmailPage } from '@/pages/verify-email-page'
export { PasswordResetRequestPage } from '@/pages/password-reset-request-page'
export { PasswordResetConfirmPage } from '@/pages/password-reset-confirm-page'
export { UserProfilePage } from '@/pages/user-profile-page'
export { NotificationsPage } from '@/pages/notifications-page'

function sectionCard(title: string, text: string) {
  return (
    <Card className="animate-fade-in motion-reduce:animate-none">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sectionCard('Feature cards', 'Financial, market, social, and benchmark-ready analysis in one workflow.')}
        {sectionCard('How it works', 'Collect inputs, run analysis jobs, edit results, and export client-ready PDFs.')}
        {sectionCard('Pricing teaser', 'Starter for founders, Pro for consultants, and Agency for white-label volume.')}
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild className="shadow-card transition-transform duration-200 hover:scale-[1.02]">
          <Link to="/signup">Get started</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </PageTemplate>
  )
}

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

export { AdminDashboardPage } from '@/pages/admin-dashboard-page'
export { AdminUsersPage } from '@/pages/admin-users-page'
export { AdminAuditLogsPage } from '@/pages/admin-audit-logs-page'

export function NotFoundPage() {
  return (
    <PageTemplate title="Page not found" description="This route does not exist in the current PulseBoard workspace.">
      <p className="text-sm text-muted-foreground">Validation sample: {z.string().safeParse('ok').success ? 'ready' : 'error'}</p>
    </PageTemplate>
  )
}
