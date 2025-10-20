/**
 * TanStack Query hooks for workflow operations.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { workflowService } from '../api/workflowService'
import type { WorkflowExecutionEvent } from '../types/workflow'

/**
 * Hook to fetch available workflows (skills that can be executed as workflows).
 */
export const useWorkflows = (page = 0, limit = 12) => {
  return useQuery({
    queryKey: ['workflows', page, limit],
    queryFn: () => workflowService.listWorkflows(limit, page * limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch workflow run history.
 */
export const useWorkflowRuns = (page = 0, limit = 12) => {
  return useQuery({
    queryKey: ['workflow-runs', page, limit],
    queryFn: () => workflowService.listWorkflowRuns(limit, page * limit),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch a specific workflow run by ID.
 */
export const useWorkflowRun = (runId: string) => {
  return useQuery({
    queryKey: ['workflow-run', runId],
    queryFn: () => workflowService.getWorkflowRun(runId),
    enabled: !!runId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook for workflow execution with Server-Sent Events streaming.
 */
export const useWorkflowExecution = () => {
  const queryClient = useQueryClient()
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [events, setEvents] = useState<WorkflowExecutionEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const executeWorkflow = useCallback(
    async (skillId: string, userInput: string) => {
      setIsExecuting(true)
      setCurrentRunId(null)
      setEvents([])
      setError(null)

      try {
        // Use the streaming generator approach
        const eventStream = workflowService.executeWorkflowStream(skillId, userInput)

        for await (const event of eventStream) {
          // Set run ID when we get the start event
          if (event.type === 'start' && event.run_id) {
            setCurrentRunId(event.run_id)
            setEvents([event])
            continue
          }

          // Accumulate streaming chunks like the chat system
          if (event.type === 'thinking' || event.type === 'text') {
            setEvents(prev => {
              const newEvents = [...prev]

              // Find the last event of the same type
              const lastEventIndex = newEvents.length - 1
              const lastEvent = newEvents[lastEventIndex]

              // If last event is the same type, accumulate content
              if (lastEvent && lastEvent.type === event.type) {
                newEvents[lastEventIndex] = {
                  ...lastEvent,
                  content: (lastEvent.content || '') + (event.content || '')
                }
              } else {
                // Different type, add as new event
                newEvents.push(event)
              }

              return newEvents
            })
          } else {
            // Tool use, tool result, and other events - add as separate events
            setEvents(prev => [...prev, event])
          }

          // Handle completion or error
          if (event.type === 'complete' || event.type === 'error') {
            setIsExecuting(false)

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['workflow-runs'] })
            if (event.run_id) {
              queryClient.invalidateQueries({
                queryKey: ['workflow-run', event.run_id]
              })
            }

            if (event.type === 'error') {
              setError(event.error || 'Unknown error occurred')
            }
            break
          }
        }
      } catch (err) {
        setIsExecuting(false)
        setError(err instanceof Error ? err.message : 'Execution failed')
        console.error('Workflow execution error:', err)
      }
    },
    [queryClient]
  )

  const clearExecution = useCallback(() => {
    setIsExecuting(false)
    setCurrentRunId(null)
    setEvents([])
    setError(null)
  }, [])

  return {
    executeWorkflow,
    clearExecution,
    isExecuting,
    currentRunId,
    events,
    error,
  }
}

/**
 * Alternative hook using EventSource for workflow execution.
 * This is kept as an alternative approach.
 */
export const useWorkflowExecutionEventSource = () => {
  const queryClient = useQueryClient()
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [events, setEvents] = useState<WorkflowExecutionEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const executeWorkflow = useCallback(
    (skillId: string, userInput: string) => {
      // Clean up previous execution
      if (eventSource) {
        eventSource.close()
      }

      setIsExecuting(true)
      setCurrentRunId(null)
      setEvents([])
      setError(null)

      const source = workflowService.executeWorkflow(
        skillId,
        userInput,
        (event) => {
          setEvents(prev => [...prev, event])

          if (event.type === 'start' && event.run_id) {
            setCurrentRunId(event.run_id)
          }
        },
        (error) => {
          setError('Connection error occurred')
          setIsExecuting(false)
          console.error('EventSource error:', error)
        },
        () => {
          setIsExecuting(false)
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['workflow-runs'] })
          if (currentRunId) {
            queryClient.invalidateQueries({
              queryKey: ['workflow-run', currentRunId]
            })
          }
        }
      )

      setEventSource(source)
    },
    [queryClient, eventSource, currentRunId]
  )

  const stopExecution = useCallback(() => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    setIsExecuting(false)
  }, [eventSource])

  const clearExecution = useCallback(() => {
    stopExecution()
    setCurrentRunId(null)
    setEvents([])
    setError(null)
  }, [stopExecution])

  return {
    executeWorkflow,
    stopExecution,
    clearExecution,
    isExecuting,
    currentRunId,
    events,
    error,
  }
}
