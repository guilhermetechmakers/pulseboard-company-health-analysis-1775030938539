import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  exportAdminUsers,
  fetchAdminCompaniesPicklist,
  fetchAdminUserDetail,
  fetchAdminUsers,
  fetchAdminUsersExportJobStatus,
  impersonateAdminUser,
  patchAdminUser,
  startAdminUsersExportJob,
} from '@/api/admin'
import type { AdminUserExportBody, AdminUsersListResponse } from '@/types/admin'

export function useAdminUsersQuery(params: {
  page: number
  pageSize: number
  role: string
  status: string
  search: string
  createdFrom?: string
  createdTo?: string
  companyId?: string
}) {
  return useQuery({
    queryKey: [
      'admin',
      'users',
      params.page,
      params.pageSize,
      params.role,
      params.status,
      params.search,
      params.createdFrom ?? '',
      params.createdTo ?? '',
      params.companyId ?? '',
    ],
    queryFn: () =>
      fetchAdminUsers({
        page: params.page,
        pageSize: params.pageSize,
        role: params.role === 'all' ? undefined : params.role,
        status: params.status === 'all' ? undefined : params.status,
        search: params.search.trim() || undefined,
        createdFrom: params.createdFrom?.trim() || undefined,
        createdTo: params.createdTo?.trim() || undefined,
        companyId: params.companyId && params.companyId !== 'all' ? params.companyId : undefined,
      }),
  })
}

export function useAdminUserDetailQuery(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'users', 'detail', userId ?? ''],
    queryFn: () => fetchAdminUserDetail(userId ?? ''),
    enabled: Boolean(userId && enabled),
  })
}

export function useAdminCompaniesPicklistQuery() {
  return useQuery({
    queryKey: ['admin', 'companies', 'picklist'],
    queryFn: () => fetchAdminCompaniesPicklist(),
    staleTime: 1000 * 60 * 10,
  })
}

export function usePatchAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: patchAdminUser,
    onMutate: async (variables) => {
      await qc.cancelQueries({
        predicate: (q) => q.queryKey[0] === 'admin' && q.queryKey[1] === 'users',
      })
      const snapshots = qc.getQueriesData({
        predicate: (q) => q.queryKey[0] === 'admin' && q.queryKey[1] === 'users',
      })
      qc.setQueriesData(
        {
          predicate: (q) =>
            q.queryKey[0] === 'admin' && q.queryKey[1] === 'users' && typeof q.queryKey[2] === 'number',
        },
        (old) => {
          if (!old || typeof old !== 'object' || !('data' in old)) return old
          const cur = old as AdminUsersListResponse
          const list = Array.isArray(cur.data) ? cur.data : []
          const next = list.map((u) =>
            u.id === variables.userId
              ? {
                  ...u,
                  ...(variables.role !== undefined
                    ? { role: variables.role, roles: [variables.role] }
                    : {}),
                  ...(variables.status !== undefined ? { status: variables.status } : {}),
                }
              : u,
          )
          return { ...cur, data: next }
        },
      )
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) {
        qc.setQueryData(key, data)
      }
    },
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

export function useStartAdminUsersExportJob() {
  return useMutation({
    mutationFn: (body: AdminUserExportBody) => startAdminUsersExportJob(body),
  })
}

export function useAdminUsersExportJobStatus(jobId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'users', 'export-job', jobId ?? ''],
    queryFn: () => fetchAdminUsersExportJobStatus(jobId ?? ''),
    enabled: Boolean(jobId && enabled),
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d) return 800
      if (d.status === 'completed' || d.status === 'failed') return false
      return 800
    },
  })
}

export function useImpersonateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: impersonateAdminUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'activity'] })
    },
  })
}
