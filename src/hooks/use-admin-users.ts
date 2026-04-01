import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { exportAdminUsers, fetchAdminUsers, patchAdminUser } from '@/api/admin'

export function useAdminUsersQuery(params: {
  page: number
  pageSize: number
  role: string
  status: string
  search: string
}) {
  return useQuery({
    queryKey: ['admin', 'users', params.page, params.pageSize, params.role, params.status, params.search],
    queryFn: () =>
      fetchAdminUsers({
        page: params.page,
        pageSize: params.pageSize,
        role: params.role === 'all' ? undefined : params.role,
        status: params.status === 'all' ? undefined : params.status,
        search: params.search.trim() || undefined,
      }),
  })
}

export function usePatchAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: patchAdminUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'metrics'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'activity'] })
    },
  })
}

export function useExportAdminUsers() {
  return useMutation({
    mutationFn: exportAdminUsers,
  })
}
