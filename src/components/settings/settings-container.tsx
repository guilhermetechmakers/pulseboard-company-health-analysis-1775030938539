import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ProfileEditor } from '@/components/settings/profile-editor'
import { TeamManager } from '@/components/settings/team-manager'
import { IntegrationsCenter } from '@/components/settings/integrations-center'
import { NotificationsCenter } from '@/components/settings/notifications-center'
import { BillingPanel } from '@/components/settings/billing-panel'
import { DataImportExportPanel } from '@/components/settings/data-import-export-panel'
import { DangerZone } from '@/components/settings/danger-zone'
import { DashboardLinkBridge } from '@/components/settings/dashboard-link-bridge'
import type { Database } from '@/types/database'
import type { IntegrationRow } from '@/types/integrations'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface SettingsContainerProps {
  userId: string | undefined
  companyId: string
  profile: ProfileRow | null | undefined
  profileLoading: boolean
  integrations: IntegrationRow[]
  integrationsLoading: boolean
  onCsvFocus?: () => void
  /** OAuth callback UI, CSV import runner, sync history, etc. */
  children?: ReactNode
}

export function SettingsContainer({
  userId,
  companyId,
  profile,
  profileLoading,
  integrations,
  integrationsLoading,
  onCsvFocus,
  children,
}: SettingsContainerProps) {
  return (
    <DashboardLayout>
      <section className="space-y-10 pb-16 motion-safe:animate-fade-in-up motion-reduce:animate-none">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings & preferences</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Profile, team, integrations, notifications, billing, data I/O, and account controls for your PulseBoard workspace.
            Tokens and API secrets never render in the browser.
          </p>
        </div>

        <div className="sr-only" aria-live="polite" id="settings-status-region" />

        <DashboardLinkBridge companyId={companyId} />

        {userId ? <ProfileEditor userId={userId} profile={profile} isLoading={profileLoading} /> : null}

        <TeamManager companyId={companyId} />

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Account security</h2>
          <p className="mt-1 text-sm text-muted-foreground">Password, MFA, and activity history.</p>
          <Button asChild variant="secondary" className="mt-4 min-h-[44px]">
            <Link to="/profile">Open profile & security</Link>
          </Button>
        </Card>

        <NotificationsCenter />

        <BillingPanel userId={userId} companyId={companyId} />

        <IntegrationsCenter
          companyId={companyId}
          integrations={integrations}
          isLoading={integrationsLoading}
          onCsvFocus={onCsvFocus}
        />

        <DataImportExportPanel companyId={companyId} />

        {children}

        <DangerZone companyId={companyId} />
      </section>
    </DashboardLayout>
  )
}
