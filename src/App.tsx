import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { AuthProvider } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import {
  LandingPage,
  SignupPage,
  VerifyEmailPage,
  LoginPage,
  DashboardPage,
  CreateCompanyPage,
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
  PasswordResetRequestPage,
  PasswordResetConfirmPage,
  NotFoundPage,
  NotificationsPage,
} from '@/pages'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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

              <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
              <Route path="/dashboard/overview" element={<Guard><DashboardPage /></Guard>} />
              <Route path="/dashboard/analytics" element={<Guard><CompanyDetailPage /></Guard>} />
              <Route path="/dashboard/settings" element={<Guard><SettingsPage /></Guard>} />
              <Route path="/dashboard/users" element={<Guard><AdminUsersPage /></Guard>} />
              <Route path="/dashboard/projects" element={<Guard><CreateCompanyPage /></Guard>} />
              <Route path="/company/create" element={<Guard><CreateCompanyPage /></Guard>} />
              <Route path="/company" element={<Guard><CompanyDetailPage /></Guard>} />
              <Route path="/financials" element={<Guard><FinancialsPage /></Guard>} />
              <Route path="/market" element={<Guard><MarketDataPage /></Guard>} />
              <Route path="/social-brand" element={<Guard><SocialBrandPage /></Guard>} />
              <Route path="/analysis/generate" element={<Guard><GenerateAnalysisPage /></Guard>} />
              <Route path="/generate" element={<Guard><GenerateAnalysisPage /></Guard>} />
              <Route path="/report/:id" element={<Guard><ReportViewerPage /></Guard>} />
              <Route path="/reports/:reportId" element={<Guard><ReportViewerPage /></Guard>} />
              <Route path="/export/:id" element={<Guard><ExportSettingsPage /></Guard>} />
              <Route path="/profile" element={<Guard><UserProfilePage /></Guard>} />
              <Route path="/settings" element={<Guard><SettingsPage /></Guard>} />
              <Route path="/notifications" element={<Guard><NotificationsPage /></Guard>} />
              <Route path="/admin/users" element={<Guard><AdminUsersPage /></Guard>} />
              <Route path="/admin" element={<Guard><AdminDashboardPage /></Guard>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
