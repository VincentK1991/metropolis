/**
 * API service for workflow operations with SSE support.
 */

import { createApiClient } from './baseApiclient'
import type { Workflow, WorkflowRun, WorkflowExecutionEvent } from '../types/workflow'

const workflowApi = createApiClient('/api')

export const workflowService = {
  /**
   * List all available workflows (skills that can be executed as workflows).
   */
  listWorkflows: async (limit = 12, skip = 0): Promise<Workflow[]> => {
    const response = await workflowApi.get('/workflows', {
      params: { limit, skip }
    })
    return response.data
  },

  /**
   * List workflow run history with pagination.
   */
  listWorkflowRuns: async (limit = 12, skip = 0): Promise<WorkflowRun[]> => {
    const response = await workflowApi.get('/workflow-runs', {
      params: { limit, skip }
    })
    return response.data
  },

  /**
   * Get a specific workflow run by ID.
   */
  getWorkflowRun: async (runId: string): Promise<WorkflowRun> => {
    const response = await workflowApi.get(`/workflow-runs/${runId}`)
    return response.data
  },

  /**
   * Execute a workflow with Server-Sent Events streaming.
   *
   * @param skillId - ID of the skill to execute as workflow
   * @param userInput - User's natural language input
   * @param onEvent - Callback for handling SSE events
   * @param onError - Callback for handling errors
   * @param onComplete - Callback for when execution completes
   * @returns EventSource instance for managing the connection
   */
  executeWorkflow: (
    skillId: string,
    _userInput: string,
    onEvent: (event: WorkflowExecutionEvent) => void,
    onError?: (error: Event) => void,
    onComplete?: () => void
  ): EventSource => {
    // Create URL for SSE endpoint
    const url = `/api/workflows/${skillId}/execute`

    // Create EventSource with POST-like behavior using URL parameters
    // Note: EventSource doesn't support POST directly, so we'll use a custom approach
    const eventSource = new EventSource(url, {
      withCredentials: false
    })

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data: WorkflowExecutionEvent = JSON.parse(event.data)
        onEvent(data)

        // Check if execution is complete
        if (data.type === 'complete' || data.type === 'error') {
          eventSource.close()
          if (onComplete) {
            onComplete()
          }
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
        if (onError) {
          onError(event as any)
        }
      }
    }

    // Handle errors
    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event)
      if (onError) {
        onError(event)
      }
    }

    return eventSource
  },

  /**
   * Alternative method for workflow execution using fetch with streaming.
   * This allows proper POST requests with body data.
   */
  executeWorkflowStream: async function* (
    skillId: string,
    userInput: string
  ): AsyncGenerator<WorkflowExecutionEvent, void, unknown> {
    const response = await fetch(`http://localhost:8088/api/workflows/${skillId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ user_input: userInput }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6) // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const event: WorkflowExecutionEvent = JSON.parse(jsonStr)
                yield event

                // Stop if execution is complete
                if (event.type === 'complete' || event.type === 'error') {
                  return
                }
              }
            } catch (error) {
              console.error('Error parsing SSE line:', error, line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
