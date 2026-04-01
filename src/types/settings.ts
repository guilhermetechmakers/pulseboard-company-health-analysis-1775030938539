export type PreferredCommunicationChannel = 'email' | 'in_app' | 'both'

export type TeamMemberRow = {
  id: string
  team_id: string
  user_id: string
  role: string
  status: string
  created_at: string
  displayName: string | null
  email: string | null
}

export type TeamInviteRow = {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string | null
}

export type WorkspaceTeamRow = {
  id: string
  company_id: string
  owner_user_id: string
  seats: number
  created_at: string
}

export type TeamBundleResponse = {
  team: WorkspaceTeamRow
  members: TeamMemberRow[]
  invites: TeamInviteRow[]
}

export type CsvParsePreviewResponse = {
  headers: string[]
  sampleRows: Record<string, string>[]
  issues: string[]
  suggestedMapping: Record<string, string>
}

export type ExportScopePreset = 'full_backup' | 'analytics' | 'financials' | 'social'

export interface BillingSummaryResult {
  subscription: Record<string, unknown> | null
  paymentsPortalUrl: string | null
  receiptsNote: string
}

export interface AccountDeleteRequestResult {
  ok: boolean
  message: string
}

export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const

export const SUPPORTED_LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
] as const
