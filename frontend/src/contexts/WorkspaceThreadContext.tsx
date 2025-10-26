/**
 * Context for workspace thread chat using SSE streaming.
 */

import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'
import { chatInWorkspaceThread, getWorkspaceThread } from '../api/workspaceService'
import type { ChatMessage, MessageContent } from '../types/chat'

interface WorkspaceThreadContextType {
  messages: ChatMessage[]
  isStreaming: boolean
  isLoadingHistory: boolean
  error: string | null
  threadId: string | null
  workspaceId: string | null
  sendMessage: (message: string) => void
  resetThread: () => void
  setWorkspaceId: (workspaceId: string) => void
  setThreadId: (threadId: string | null) => void
  loadThreadHistory: (workspaceId: string, threadId: string) => Promise<void>
  onThreadCreated: ((threadId: string) => void) | null
  setOnThreadCreated: (callback: ((threadId: string) => void) | null) => void
}

const WorkspaceThreadContext = createContext<WorkspaceThreadContextType | undefined>(undefined)

export const WorkspaceThreadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadId, setThreadIdState] = useState<string | null>(null)
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(null)
  const [onThreadCreated, setOnThreadCreated] = useState<((threadId: string) => void) | null>(null)

  const currentMessageRef = useRef<ChatMessage | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id)
  }, [])

  const setThreadId = useCallback((id: string | null) => {
    setThreadIdState(id)
  }, [])

  const resetThread = useCallback(() => {
    setMessages([])
    setThreadIdState(null)
    currentMessageRef.current = null
    setError(null)
    abortControllerRef.current?.abort()
  }, [])

  const loadThreadHistory = useCallback(async (workspaceId: string, threadId: string) => {
    try {
      setIsLoadingHistory(true)
      setError(null)

      const data = await getWorkspaceThread(workspaceId, threadId)

      // Convert message history to ChatMessage format
      const historicalMessages: ChatMessage[] = data.messages.map((msg) => ({
        id: `${msg.role}-${msg.sequence}`,
        role: msg.role as 'user' | 'assistant',
        contents: msg.content_blocks as MessageContent[],
        timestamp: new Date(msg.created_at),
      }))

      setMessages(historicalMessages)
      setThreadIdState(threadId)
      setWorkspaceIdState(workspaceId)
    } catch (err: any) {
      setError(`Failed to load thread history: ${err.message}`)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const sendMessage = useCallback((text: string) => {
    if (!workspaceId) {
      setError('No workspace selected')
      return
    }

    try {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        contents: [{
          type: 'text',
          content: text,
          timestamp: new Date(),
        }],
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, userMessage])

      // Initialize a new assistant message for streaming response
      currentMessageRef.current = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        contents: [],
        timestamp: new Date(),
      }

      setIsStreaming(true)
      setError(null)

      // Use current threadId or "pending" for new thread
      const actualThreadId = threadId || 'pending'

      // Set up abort controller for this request
      abortControllerRef.current = new AbortController()

      // Start SSE streaming
      chatInWorkspaceThread(
        workspaceId,
        actualThreadId,
        text,
        (data) => {
          // Handle thread_created event
          if (data.type === 'thread_created') {
            if (data.thread_id) {
              setThreadIdState(data.thread_id)
              console.log('Thread created with ID:', data.thread_id)
              // Call the callback if set
              if (onThreadCreated) {
                onThreadCreated(data.thread_id)
              }
            }
            return
          }

          // Handle complete event
          if (data.type === 'complete') {
            currentMessageRef.current = null
            setIsStreaming(false)
            return
          }

          // Handle error event
          if (data.type === 'error') {
            setError(data.error || 'An error occurred')
            setIsStreaming(false)
            return
          }

          // Add content to current streaming message
          if (currentMessageRef.current &&
              (data.type === 'text' || data.type === 'thinking' ||
               data.type === 'tool_use' || data.type === 'tool_result')) {
            const newContent: MessageContent = {
              type: data.type,
              content: data.content || '',
              timestamp: new Date(),
              ...(data.toolName && { toolName: data.toolName }),
              ...(data.toolInput && { toolInput: data.toolInput }),
              ...(data.todos && { todos: data.todos }),
              ...(data.toolCallId && { toolCallId: data.toolCallId }),
            } as MessageContent

            // For streaming text/thinking, append to the last content of the same type
            if (data.type === 'text' || data.type === 'thinking') {
              const lastContent = currentMessageRef.current.contents[currentMessageRef.current.contents.length - 1]

              if (lastContent && lastContent.type === data.type && 'content' in lastContent) {
                // Append to existing content
                lastContent.content += data.content || ''
              } else {
                // Create new content block
                currentMessageRef.current.contents.push(newContent)
              }
            } else {
              // For tool_use and tool_result, always add as new content
              currentMessageRef.current.contents.push(newContent)
            }

            // Capture the current message to avoid null reference in callback
            const currentMessage = { ...currentMessageRef.current }

            // Update the messages to trigger re-render
            setMessages(prev => {
              const updated = [...prev]
              const existingIndex = updated.findIndex(m => m.id === currentMessage.id)

              if (existingIndex >= 0) {
                updated[existingIndex] = currentMessage
              } else {
                updated.push(currentMessage)
              }

              return updated
            })
          }
        },
        (err) => {
          setError(`Stream error: ${err.message}`)
          setIsStreaming(false)
        },
        () => {
          setIsStreaming(false)
        }
      )
    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`)
      setIsStreaming(false)
    }
  }, [workspaceId, threadId])

  const value: WorkspaceThreadContextType = {
    messages,
    isStreaming,
    isLoadingHistory,
    error,
    threadId,
    workspaceId,
    sendMessage,
    resetThread,
    setWorkspaceId,
    setThreadId,
    loadThreadHistory,
    onThreadCreated,
    setOnThreadCreated: (callback) => setOnThreadCreated(() => callback),
  }

  return (
    <WorkspaceThreadContext.Provider value={value}>
      {children}
    </WorkspaceThreadContext.Provider>
  )
}

export const useWorkspaceThreadContext = () => {
  const context = useContext(WorkspaceThreadContext)
  if (context === undefined) {
    throw new Error('useWorkspaceThreadContext must be used within a WorkspaceThreadProvider')
  }
  return context
}

