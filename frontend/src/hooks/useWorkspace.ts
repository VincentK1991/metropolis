/**
 * Custom hooks for workspace management.
 */

import { useState, useCallback } from 'react'
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listWorkspaceThreads,
  createWorkspaceThread,
  getWorkspaceThread,
} from '../api/workspaceService'
import type {
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  CreateThreadRequest,
  WorkspaceThread,
} from '../types/workspace'
import type { ClaudeAgentMessage } from '../types/session'

interface UseWorkspaceResult {
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  loadWorkspaces: (limit?: number, skip?: number) => Promise<void>
  createNewWorkspace: (request: CreateWorkspaceRequest) => Promise<Workspace | null>
  updateExistingWorkspace: (
    workspaceId: string,
    request: UpdateWorkspaceRequest
  ) => Promise<boolean>
  deleteExistingWorkspace: (workspaceId: string) => Promise<boolean>
}

/**
 * Hook for managing workspaces.
 */
export const useWorkspace = (): UseWorkspaceResult => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspaces = useCallback(async (limit = 12, skip = 0) => {
    try {
      setLoading(true)
      setError(null)
      const data = await listWorkspaces(limit, skip)
      setWorkspaces(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  const createNewWorkspace = useCallback(
    async (request: CreateWorkspaceRequest): Promise<Workspace | null> => {
      try {
        setError(null)
        const workspace = await createWorkspace(request)
        setWorkspaces((prev) => [workspace, ...prev])
        return workspace
      } catch (err: any) {
        setError(err.message || 'Failed to create workspace')
        return null
      }
    },
    []
  )

  const updateExistingWorkspace = useCallback(
    async (workspaceId: string, request: UpdateWorkspaceRequest): Promise<boolean> => {
      try {
        setError(null)
        const result = await updateWorkspace(workspaceId, request)
        if (result.success) {
          // Refresh workspace list
          const data = await listWorkspaces()
          setWorkspaces(data)
        }
        return result.success
      } catch (err: any) {
        setError(err.message || 'Failed to update workspace')
        return false
      }
    },
    []
  )

  const deleteExistingWorkspace = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      setError(null)
      const result = await deleteWorkspace(workspaceId)
      if (result.success) {
        setWorkspaces((prev) => prev.filter((w) => w._id !== workspaceId))
      }
      return result.success
    } catch (err: any) {
      setError(err.message || 'Failed to delete workspace')
      return false
    }
  }, [])

  return {
    workspaces,
    loading,
    error,
    loadWorkspaces,
    createNewWorkspace,
    updateExistingWorkspace,
    deleteExistingWorkspace,
  }
}

interface UseWorkspaceThreadsResult {
  threads: WorkspaceThread[]
  loading: boolean
  error: string | null
  loadThreads: (workspaceId: string, limit?: number, skip?: number) => Promise<void>
  createNewThread: (workspaceId: string, request?: CreateThreadRequest) => Promise<string | null>
  loadThread: (
    workspaceId: string,
    threadId: string
  ) => Promise<{ session: WorkspaceThread; messages: ClaudeAgentMessage[] } | null>
}

/**
 * Hook for managing workspace threads.
 */
export const useWorkspaceThreads = (): UseWorkspaceThreadsResult => {
  const [threads, setThreads] = useState<WorkspaceThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadThreads = useCallback(async (workspaceId: string, limit = 20, skip = 0) => {
    try {
      setLoading(true)
      setError(null)
      const data = await listWorkspaceThreads(workspaceId, limit, skip)
      setThreads(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load threads')
    } finally {
      setLoading(false)
    }
  }, [])

  const createNewThread = useCallback(
    async (workspaceId: string, request: CreateThreadRequest = {}): Promise<string | null> => {
      try {
        setError(null)
        const result = await createWorkspaceThread(workspaceId, request)
        return result.thread_id
      } catch (err: any) {
        setError(err.message || 'Failed to create thread')
        return null
      }
    },
    []
  )

  const loadThread = useCallback(
    async (
      workspaceId: string,
      threadId: string
    ): Promise<{ session: WorkspaceThread; messages: ClaudeAgentMessage[] } | null> => {
      try {
        setError(null)
        const data = await getWorkspaceThread(workspaceId, threadId)
        return data
      } catch (err: any) {
        setError(err.message || 'Failed to load thread')
        return null
      }
    },
    []
  )

  return {
    threads,
    loading,
    error,
    loadThreads,
    createNewThread,
    loadThread,
  }
}

