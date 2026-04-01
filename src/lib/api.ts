import { readStoredActiveCompanyId } from '@/lib/active-company-storage'
import { supabase } from '@/lib/supabase'

const ACTIVE_COMPANY_HEADER = 'X-Active-Company-Id'
const LEGACY_ACTIVE_COMPANY_HEADER = 'X-PulseBoard-Active-Company-Id'

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  } else {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const activeCompanyId = readStoredActiveCompanyId()
  if (activeCompanyId) {
    headers[ACTIVE_COMPANY_HEADER] = activeCompanyId
    headers[LEGACY_ACTIVE_COMPANY_HEADER] = activeCompanyId
  }

  return headers
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const url = `${baseUrl}${endpoint}`
  const authHeaders = await getAuthHeaders()
  const headers: HeadersInit = {
    ...authHeaders,
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    throw new ApiError(`API Error: ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, payload: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(payload) }),
  put: <T>(endpoint: string, payload: unknown) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(payload) }),
  patch: <T>(endpoint: string, payload: unknown) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
}

/** Full-text / faceted search via `pulse-search` Edge Function. */
export { invokePulseSearch } from '@/lib/pulse-search-api'

/** Prefer `@/lib/supabase-functions` for authenticated Edge Function calls (native fetch + session). */
export {
  invokeAnalyzeCompanyHealth,
  invokeReportExport,
  invokeExportDownloadUrl,
  invokeEmailSend,
  invokeEmailRetry,
  invokePulseDataIo,
  invokePulseCompanyApi,
  invokePulseCompaniesApi,
  invokePulseDashboardApi,
  invokePulseActiveCompany,
  pulseDataIoImportCsv,
  pulseDataIoImportStatus,
  pulseDataIoExportCsv,
  pulseDataIoExportStatus,
  pulseDataIoExportDownload,
} from '@/lib/supabase-functions'

/** TTL-backed workspace reads (deploy `pulse-cache-api` Edge Function). */
export {
  invokePulseCacheApi,
  fireAndForgetInvalidateCompanyCache,
  fireAndForgetInvalidateReportCache,
} from '@/lib/pulse-cache-api'
