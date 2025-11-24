import { createApiClient } from './baseApiclient'
import type {
  AgentV2Session,
  AgentV2Message,
  AgentV2SSEEventUnion,
  PaginatedSessionsResponse,
  PaginatedMessagesResponse,
} from '../types/agentV2'

const api = createApiClient('/api')

/**
 * List local agent v2 sessions with pagination
 */
export const listLocalAgentV2Sessions = async (
  limit: number = 20,
  skip: number = 0
): Promise<PaginatedSessionsResponse> => {
  try {
    const response = await api.get<PaginatedSessionsResponse>(
      '/v2/local-agent/sessions',
      {
        params: { limit, skip },
      }
    )
    return response.data
  } catch (error: any) {
    // If 404, return empty paginated response
    if (error.response?.status === 404) {
      return {
        sessions: [],
        total: 0,
        limit,
        skip,
      }
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Get a specific local agent v2 session
 */
export const getLocalAgentV2Session = async (
  sessionId: string
): Promise<AgentV2Session> => {
  const response = await api.get<AgentV2Session>(
    `/v2/local-agent/sessions/${sessionId}`
  )
  return response.data
}

/**
 * Get messages for a specific local agent v2 session with pagination
 */
export const getLocalAgentV2SessionMessages = async (
  sessionId: string,
  limit: number = 50,
  skip: number = 0,
  reverse: boolean = false
): Promise<PaginatedMessagesResponse> => {
  const response = await api.get<PaginatedMessagesResponse>(
    `/v2/local-agent/sessions/${sessionId}/messages`,
    {
      params: { limit, skip, reverse },
    }
  )
  return response.data
}

/**
 * Delete a local agent v2 session
 */
export const deleteLocalAgentV2Session = async (
  sessionId: string
): Promise<void> => {
  await api.delete(`/v2/local-agent/sessions/${sessionId}`)
}

/**
 * Rename a local agent v2 session
 */
export const renameLocalAgentV2Session = async (
  sessionId: string,
  title: string
): Promise<AgentV2Session> => {
  const response = await api.patch<AgentV2Session>(
    `/v2/local-agent/sessions/${sessionId}/rename`,
    { title }
  )
  return response.data
}

/**
 * Send a chat message in local agent v2 with SSE streaming.
 *
 * @param sessionId - Optional session ID to resume, or null for new session
 * @param message - The user message
 * @param onMessage - Callback for each SSE message
 * @param onError - Callback for errors
 * @param onComplete - Callback when stream completes
 * @returns AbortController for canceling the request
 */
export const chatInLocalAgentV2 = (
  sessionId: string | null,
  message: string,
  onMessage: (data: AgentV2SSEEventUnion) => void,
  onError: (error: any) => void,
  onComplete: () => void
): AbortController => {
  const abortController = new AbortController()
  const baseUrl = api.defaults.baseURL || ''
  const url = `${baseUrl}/v2/local-agent/query`

  // Prepare request body
  const requestBody: { user_input: string; session_id?: string } = {
    user_input: message,
  }
  if (sessionId) {
    requestBody.session_id = sessionId
  }

  // Make POST request and read SSE stream
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
    signal: abortController.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Read the SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      const readStream = () => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              onComplete()
              return
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true })

            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed && trimmed.startsWith('data: ')) {
                const data = trimmed.slice(6) // Remove 'data: ' prefix
                try {
                  const parsed = JSON.parse(data) as AgentV2SSEEventUnion
                  onMessage(parsed)

                  // Stop reading if we get complete or error
                  if (parsed.type === 'complete' || parsed.type === 'error') {
                    onComplete()
                    return
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e)
                }
              }
            }

            // Continue reading
            readStream()
          })
          .catch((error) => {
            if (error.name !== 'AbortError') {
              onError(error)
            }
          })
      }

      readStream()
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error)
      }
    })

  return abortController
}

