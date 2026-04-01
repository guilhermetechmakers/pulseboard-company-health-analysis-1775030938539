export interface Project {
  id: string
  name: string
  description: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateProjectInput {
  name: string
  description: string
  user_id: string
}
