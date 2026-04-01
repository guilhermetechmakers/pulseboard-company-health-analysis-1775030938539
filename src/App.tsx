import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import {
  LandingPage,
  SignupPage,
  EmailVerificationPage,
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
  PasswordResetPage,
  NotFoundPage,
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/overview" element={<DashboardPage />} />
            <Route path="/dashboard/analytics" element={<CompanyDetailPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/users" element={<AdminUsersPage />} />
            <Route path="/dashboard/projects" element={<CreateCompanyPage />} />
            <Route path="/company/create" element={<CreateCompanyPage />} />
            <Route path="/company" element={<CompanyDetailPage />} />
            <Route path="/financials" element={<FinancialsPage />} />
            <Route path="/market" element={<MarketDataPage />} />
            <Route path="/social-brand" element={<SocialBrandPage />} />
            <Route path="/analysis/generate" element={<GenerateAnalysisPage />} />
            <Route path="/report/:id" element={<ReportViewerPage />} />
            <Route path="/export/:id" element={<ExportSettingsPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
