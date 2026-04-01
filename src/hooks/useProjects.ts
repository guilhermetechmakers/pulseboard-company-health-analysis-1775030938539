import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '@/api/projects'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })
}
