import { supabase } from '@/lib/supabase'

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

/** Prefer `@/lib/supabase-functions` for authenticated Edge Function calls (native fetch + session). */
export {
  invokeAnalyzeCompanyHealth,
  invokeReportExport,
  invokeExportDownloadUrl,
  invokeEmailSend,
  invokeEmailRetry,
} from '@/lib/supabase-functions'

/** TTL-backed workspace reads (deploy `pulse-cache-api` Edge Function). */
export {
  invokePulseCacheApi,
  fireAndForgetInvalidateCompanyCache,
  fireAndForgetInvalidateReportCache,
} from '@/lib/pulse-cache-api'
