import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { AuthProvider } from '@/contexts/auth-context'
import { ActiveCompanyProvider } from '@/contexts/active-company-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { RequireCompanyRoute } from '@/components/auth/require-company-route'
import {
  LandingPage,
  SignupPage,
  VerifyEmailPage,
  LoginPage,
  DashboardPage,
  CreateCompanyPage,
  CompanyWizardEditPage,
  CompanyDetailPage,
  FinancialsPage,
  MarketDataPage,
  SocialBrandPage,
  GenerateAnalysisPage,
  ReportViewerPage,
  ExportSettingsPage,
  UserProfilePage,
  SettingsPage,
  AdminUsersPage,
  AdminDashboardPage,
  AdminAuditLogsPage,
  AdminCompanyConsolidationPage,
  PasswordResetRequestPage,
  PasswordResetConfirmPage,
  NotFoundPage,
  NotificationsPage,
  DataImportPage,
  DataExportPage,
  SearchPage,
  SingleCompanyBlockedPage,
} from '@/pages'
import { AdminOnlyRoute } from '@/components/auth/admin-only-route'
import { AdminLayout } from '@/components/layout/admin-layout'
import { GlobalErrorBoundary } from '@/components/error-boundary/global-error-boundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function Guard({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

/** Authenticated routes that need a `companies` row (single-company workspace). */
function Workspace({ children }: { children: ReactNode }) {
  return (
    <Guard>
      <RequireCompanyRoute>{children}</RequireCompanyRoute>
    </Guard>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <GlobalErrorBoundary>
            <ActiveCompanyProvider>
              <AppShell>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/password-reset" element={<PasswordResetRequestPage />} />
                  <Route path="/password-reset/confirm" element={<PasswordResetConfirmPage />} />
                  <Route path="/password-reset/:token" element={<PasswordResetConfirmPage />} />
                  <Route path="/reset-password" element={<Navigate to="/password-reset" replace />} />

                  <Route path="/dashboard" element={<Workspace><DashboardPage /></Workspace>} />
                  <Route path="/dashboard/overview" element={<Workspace><DashboardPage /></Workspace>} />
                  <Route path="/dashboard/analytics" element={<Workspace><CompanyDetailPage /></Workspace>} />
                  <Route path="/dashboard/settings" element={<Workspace><SettingsPage /></Workspace>} />
                  <Route path="/dashboard/users" element={<Guard><Navigate to="/admin/users" replace /></Guard>} />
                  <Route path="/dashboard/projects" element={<Guard><CreateCompanyPage /></Guard>} />
                  <Route path="/company/create" element={<Guard><CreateCompanyPage /></Guard>} />
                  <Route path="/company/scope-notice" element={<Guard><SingleCompanyBlockedPage /></Guard>} />
                  <Route path="/workspace/blocked" element={<Guard><SingleCompanyBlockedPage /></Guard>} />
                  <Route path="/company" element={<Workspace><CompanyDetailPage /></Workspace>} />
                  <Route path="/company/wizard/edit" element={<Workspace><CompanyWizardEditPage /></Workspace>} />
                  <Route path="/financials" element={<Workspace><FinancialsPage /></Workspace>} />
                  <Route path="/market" element={<Workspace><MarketDataPage /></Workspace>} />
                  <Route path="/social-brand" element={<Workspace><SocialBrandPage /></Workspace>} />
                  <Route path="/analysis/generate" element={<Workspace><GenerateAnalysisPage /></Workspace>} />
                  <Route path="/generate" element={<Workspace><GenerateAnalysisPage /></Workspace>} />
                  <Route path="/report/:id" element={<Workspace><ReportViewerPage /></Workspace>} />
                  <Route path="/reports/:reportId" element={<Workspace><ReportViewerPage /></Workspace>} />
                  <Route path="/export/:id" element={<Workspace><ExportSettingsPage /></Workspace>} />
                  <Route path="/profile" element={<Guard><UserProfilePage /></Guard>} />
                  <Route path="/settings" element={<Workspace><SettingsPage /></Workspace>} />
                  <Route path="/data/import" element={<Workspace><DataImportPage /></Workspace>} />
                  <Route path="/data/export" element={<Workspace><DataExportPage /></Workspace>} />
                  <Route path="/search" element={<Workspace><SearchPage /></Workspace>} />
                  <Route path="/notifications" element={<Workspace><NotificationsPage /></Workspace>} />
                  <Route
                    path="/admin"
                    element={
                      <Guard>
                        <AdminOnlyRoute>
                          <AdminLayout />
                        </AdminOnlyRoute>
                      </Guard>
                    }
                  >
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                    <Route path="company-consolidation" element={<AdminCompanyConsolidationPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AppShell>
            </ActiveCompanyProvider>
          </GlobalErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
