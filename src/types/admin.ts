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
  status: 'active' | 'suspended'
  createdAt: string
  lastLogin: string
  profile?: { avatarUrl: string | null }
}

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
  }
}

export interface AdminUserExportResponse {
  url: string
}

export interface AdminUserPatchBody {
  userId: string
  role?: string
  status?: 'active' | 'suspended'
}
