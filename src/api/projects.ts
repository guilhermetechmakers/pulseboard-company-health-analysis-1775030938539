import { api } from '@/lib/api'
import type { CreateProjectInput, Project } from '@/types/project'

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (payload: CreateProjectInput) => api.post<Project>('/projects', payload),
}
