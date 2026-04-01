export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const url = `${baseUrl}${endpoint}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = localStorage.getItem('auth_token')
  if (token) {
    ;(headers as Record<string, string>).Authorization = `Bearer ${token}`
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
export { invokeAnalyzeCompanyHealth } from '@/lib/supabase-functions'
