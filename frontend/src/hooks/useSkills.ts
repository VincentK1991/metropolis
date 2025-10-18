import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { skillService } from '../api/skillService'
import type { Skill } from '../types/skill'

export const useSkills = (page = 0, limit = 12) => {
  return useQuery({
    queryKey: ['skills', page],
    queryFn: async () => {
      const response = await skillService.listSkills(limit, page * limit)
      return response.data
    }
  })
}

export const useSkill = (id: string) => {
  return useQuery({
    queryKey: ['skill', id],
    queryFn: async () => {
      const response = await skillService.getSkill(id)
      return response.data as Skill
    },
    enabled: !!id
  })
}

export const useCreateSkill = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await skillService.createSkill(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
    }
  })
}

export const useUpdateSkill = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; content?: string } }) => {
      const response = await skillService.updateSkill(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      queryClient.invalidateQueries({ queryKey: ['skill'] })
    }
  })
}

export const useDeleteSkill = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await skillService.deleteSkill(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
    }
  })
}

