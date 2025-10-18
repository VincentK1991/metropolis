import { createApiClient } from './baseApiclient'
import type { Skill, SkillsListResponse } from '../types/skill'

const skillApiClient = createApiClient('/api/skills')

export const skillService = {
  /**
   * List skills with pagination
   */
  listSkills: (limit: number = 12, skip: number = 0) => {
    return skillApiClient.get<SkillsListResponse>('/', {
      params: { limit, skip }
    })
  },

  /**
   * Get a single skill by ID
   */
  getSkill: (id: string) => {
    return skillApiClient.get<Skill>(`/${id}`)
  },

  /**
   * Create a new skill
   */
  createSkill: (data: { title: string; content: string }) => {
    return skillApiClient.post<Skill>('/', data)
  },

  /**
   * Update an existing skill
   */
  updateSkill: (id: string, data: { title?: string; content?: string }) => {
    return skillApiClient.patch<{ success: boolean }>(`/${id}`, data)
  },

  /**
   * Delete a skill
   */
  deleteSkill: (id: string) => {
    return skillApiClient.delete<{ success: boolean }>(`/${id}`)
  }
}

