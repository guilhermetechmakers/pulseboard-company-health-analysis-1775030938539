export type AdminHealthStatus = 'green' | 'yellow' | 'red'

export interface AdminTrendPoint {
  date: string
  count: number
}

export interface AdminRecentActivityItem {
  id: string
  adminId: string
  action: string
  targetUserId: string
  timestamp: string
  metadata: Record<string, unknown>
}

export interface AdminUsageMetrics {
  activeCompanies: number
  dailyReports: number
  weeklyReports: number
  monthlyReports: number
  uptimePct: number
  latencyMs: number
  errorRate: number
  adminActions: number
  topIssues: string[]
  queueDepth: number
  activeSessionsApprox: number
  companiesTrend: AdminTrendPoint[]
  reportsTrend: AdminTrendPoint[]
  recentActivity: AdminRecentActivityItem[]
}

export interface AdminSystemHealth {
  status: AdminHealthStatus
  details: string[]
}

export interface AdminUserRow {
  id: string
  email: string
  name: string
  role: string
  /** Mirrors `role` for table display; always guarded when mapping. */
  roles?: string[]
  status: 'active' | 'suspended'
  createdAt: string
  lastLogin: string
  lastActiveAt?: string
  linkedCompanies?: string[]
  profile?: { avatarUrl: string | null }
}

export interface AdminUserDetailCompany {
  id: string
  name: string
  via: 'owner' | 'member'
  role?: string
}

export interface AdminUserActivityItem {
  id: string
  action: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AdminUserDetailResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
    roles: string[]
    status: 'active' | 'suspended'
    createdAt: string
    lastLogin: string
    linkedCompanies: AdminUserDetailCompany[]
  }
  activity: AdminUserActivityItem[]
}

export interface AdminImpersonateResponse {
  impersonationToken: string
  magicLink: string
  expiresAt: string
  targetUserId: string
  message: string
}

export interface AdminCompanyPicklistItem {
  id: string
  name: string
}

export interface AdminExportJobStartResponse {
  jobId: string
}

export type AdminExportJobStatusResponse =
  | { status: 'pending' | 'processing' }
  | { status: 'completed'; downloadUrl: string }
  | { status: 'failed'; errorMessage: string }

export interface AdminUsersListResponse {
  data: AdminUserRow[]
  total: number
}

export interface AdminUserExportBody {
  format: 'csv' | 'json'
  filters?: {
    role?: string
    status?: string
    createdAtRange?: { from?: string; to?: string }
    createdFrom?: string
    createdTo?: string
    companyId?: string
  }
  /** When starting a job-backed export. */
  scope?: 'filtered' | 'full'
}

export interface AdminUserExportResponse {
  url: string
}

export interface AdminUserPatchBody {
  userId: string
  role?: string
  status?: 'active' | 'suspended'
}

/** Aggregates for admin user-management analytics (Recharts + KPIs). */
export interface AdminUserManagementStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  roleDistribution: { role: string; count: number }[]
  suspensionTrend: { date: string; count: number }[]
}
