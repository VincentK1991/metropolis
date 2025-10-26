/**
 * API service for workspace and thread management.
 */

import { createApiClient } from './baseApiclient'
import type {
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  CreateThreadRequest,
  WorkspaceThread,
} from '../types/workspace'
import type { ClaudeAgentMessage } from '../types/session'

const api = createApiClient('/api')

/**
 * List all workspaces with pagination.
 */
export const listWorkspaces = async (
  limit: number = 12,
  skip: number = 0
): Promise<Workspace[]> => {
  const response = await api.get('/workspaces', { params: { limit, skip } })
  return response.data
}

/**
 * Get a workspace by ID with skill details.
 */
export const getWorkspace = async (workspaceId: string): Promise<Workspace> => {
  const response = await api.get(`/workspaces/${workspaceId}`)
  return response.data
}

/**
 * Create a new workspace.
 */
export const createWorkspace = async (
  request: CreateWorkspaceRequest
): Promise<Workspace> => {
  const response = await api.post('/workspaces', request)
  return response.data
}

/**
 * Update a workspace.
 */
export const updateWorkspace = async (
  workspaceId: string,
  request: UpdateWorkspaceRequest
): Promise<{ success: boolean }> => {
  const response = await api.put(`/workspaces/${workspaceId}`, request)
  return response.data
}

/**
 * Delete a workspace.
 */
export const deleteWorkspace = async (
  workspaceId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(`/workspaces/${workspaceId}`)
  return response.data
}

/**
 * List all threads in a workspace.
 */
export const listWorkspaceThreads = async (
  workspaceId: string,
  limit: number = 20,
  skip: number = 0
): Promise<WorkspaceThread[]> => {
  const response = await api.get(`/workspaces/${workspaceId}/threads`, {
    params: { limit, skip },
  })
  return response.data
}

/**
 * Create a new thread in a workspace.
 */
export const createWorkspaceThread = async (
  workspaceId: string,
  request: CreateThreadRequest = {}
): Promise<{ success: boolean; message: string; thread_id: string }> => {
  const response = await api.post(`/workspaces/${workspaceId}/threads`, request)
  return response.data
}

/**
 * Get a thread and its messages.
 */
export const getWorkspaceThread = async (
  workspaceId: string,
  threadId: string
): Promise<{ session: WorkspaceThread; messages: ClaudeAgentMessage[] }> => {
  const response = await api.get(`/workspaces/${workspaceId}/threads/${threadId}`)
  return response.data
}

/**
 * Delete a workspace thread.
 */
export const deleteWorkspaceThread = async (
  workspaceId: string,
  threadId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(`/workspaces/${workspaceId}/threads/${threadId}`)
  return response.data
}

/**
 * Send a chat message in a workspace thread with SSE streaming.
 *
 * @param workspaceId - The workspace ID
 * @param threadId - The thread ID or "pending" for new thread
 * @param message - The user message
 * @param onMessage - Callback for each SSE message
 * @param onError - Callback for errors
 * @param onComplete - Callback when stream completes
 */
export const chatInWorkspaceThread = (
  workspaceId: string,
  threadId: string,
  message: string,
  onMessage: (data: any) => void,
  onError: (error: any) => void,
  onComplete: () => void
): void => {
  // Use fetch with POST to initiate SSE
  const baseUrl = api.defaults.baseURL || ''
  const url = `${baseUrl}/workspaces/${workspaceId}/threads/${threadId}/chat`

  // Make POST request and read SSE stream
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Read the SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      const readStream = () => {
        reader?.read().then(({ done, value }) => {
          if (done) {
            onComplete()
            return
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)
                onMessage(parsed)
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }

          // Continue reading
          readStream()
        }).catch((error) => {
          onError(error)
        })
      }

      readStream()
    })
    .catch((error) => {
      onError(error)
    })
}

