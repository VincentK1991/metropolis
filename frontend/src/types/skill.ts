export interface Skill {
  _id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface SkillsListResponse {
  skills: Skill[]
  total?: number
}

