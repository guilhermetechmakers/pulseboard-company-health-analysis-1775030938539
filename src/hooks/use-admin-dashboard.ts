import { useQuery } from '@tanstack/react-query'
import { fetchAdminSystemHealth, fetchAdminUsageMetrics } from '@/api/admin'

export function useAdminUsageMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics', 'usage'],
    queryFn: fetchAdminUsageMetrics,
  })
}

export function useAdminSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: fetchAdminSystemHealth,
  })
}
