import { useState, useCallback, useRef, useEffect } from 'react'
import {
  listAgentV2Sessions,
  getAgentV2SessionMessages,
  chatInAgentV2,
  deleteAgentV2Session,
  renameAgentV2Session,
} from '../api/agentV2Service'
import type { ChatMessage, MessageContent } from '../types/chat'
import type { AgentV2Session, AgentV2SSEEventUnion } from '../types/agentV2'

interface UseAgentV2ChatResult {
  messages: ChatMessage[]
  isStreaming: boolean
  isLoadingHistory: boolean
  error: string | null
  sessionId: string | null
  availableSessions: AgentV2Session[]
  // Session pagination
  hasMoreSessions: boolean
  isLoadingMoreSessions: boolean
  // Message pagination
  hasMoreMessages: boolean
  isLoadingOlderMessages: boolean
  sendMessage: (text: string) => void
  startNewSession: () => void
  switchToSession: (sessionId: string) => Promise<void>
  loadAvailableSessions: () => Promise<void>
  loadMoreSessions: () => Promise<void>
  loadOlderMessages: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, newTitle: string) => Promise<void>
}

export const useAgentV2Chat = (): UseAgentV2ChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [availableSessions, setAvailableSessions] = useState<AgentV2Session[]>([])

  // Session pagination state
  const [sessionSkip, setSessionSkip] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false)
  const sessionLimit = 20

  // Message pagination state
  const [messageSkip, setMessageSkip] = useState(0)
  const [totalMessages, setTotalMessages] = useState(0)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const messageLimit = 5 // Reduced for testing, will revert later

  const currentMessageRef = useRef<ChatMessage | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadAvailableSessions = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setSessionSkip(0)
      }
      const skip = reset ? 0 : sessionSkip
      const response = await listAgentV2Sessions(sessionLimit, skip)

      if (reset) {
        setAvailableSessions(response.sessions || [])
        setSessionSkip(response.sessions.length)
      } else {
        setAvailableSessions((prev) => [...prev, ...(response.sessions || [])])
        setSessionSkip((prev) => prev + response.sessions.length)
      }

      setTotalSessions(response.total)

      // Clear any session loading errors on success
      setError((prevError) => {
        if (prevError && prevError.includes('Failed to load sessions')) {
          return null
        }
        return prevError
      })
    } catch (err: any) {
      // If 404, it means no sessions exist yet - that's fine, just show empty state
      if (err.response?.status === 404) {
        console.log('No sessions found (404) - starting with empty state')
        setAvailableSessions([])
        setSessionSkip(0)
        setTotalSessions(0)
        setError((prevError) => {
          if (prevError && prevError.includes('Failed to load sessions')) {
            return null
          }
          return prevError
        })
      } else {
        console.error('Failed to load sessions:', err)
        // Only show error for non-404 errors
        setError(`Failed to load sessions: ${err.message}`)
      }
    }
  }, [sessionSkip, sessionLimit])

  const loadMoreSessions = useCallback(async () => {
    if (isLoadingMoreSessions || sessionSkip >= totalSessions) {
      return
    }

    try {
      setIsLoadingMoreSessions(true)
      const response = await listAgentV2Sessions(sessionLimit, sessionSkip)

      setAvailableSessions((prev) => [...prev, ...(response.sessions || [])])
      setSessionSkip((prev) => prev + response.sessions.length)
      setTotalSessions(response.total)
    } catch (err: any) {
      console.error('Failed to load more sessions:', err)
      setError(`Failed to load more sessions: ${err.message}`)
    } finally {
      setIsLoadingMoreSessions(false)
    }
  }, [sessionSkip, totalSessions, sessionLimit, isLoadingMoreSessions])

  const loadSessionHistory = useCallback(async (sessionIdToLoad: string) => {
    try {
      setIsLoadingHistory(true)
      setError(null)

      // Load most recent messages first (reverse=true gets newest first)
      const response = await getAgentV2SessionMessages(
        sessionIdToLoad,
        messageLimit,
        0,
        true
      )

      // Convert API messages to ChatMessage format
      const historicalMessages: ChatMessage[] = response.messages.map((msg) => ({
        id: `${msg.role}-${msg.sequence}`,
        role: msg.role as 'user' | 'assistant',
        contents: msg.content_blocks as MessageContent[],
        timestamp: new Date(msg.created_at),
      }))

      setMessages(historicalMessages)
      setSessionId(sessionIdToLoad)
      setTotalMessages(response.total)
      setMessageSkip(response.messages.length)
    } catch (err: any) {
      setError(`Failed to load session history: ${err.message}`)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [messageLimit])

  const loadOlderMessages = useCallback(async () => {
    if (!sessionId || isLoadingOlderMessages || messageSkip >= totalMessages) {
      return
    }

    try {
      setIsLoadingOlderMessages(true)

      // Calculate skip from oldest end
      // If total=200, we loaded 50 newest (sequences 150-199), messageSkip=50
      // To get next 50 older (100-149), we need skip=100 from oldest end
      // skipFromOldest = totalMessages - messageSkip - messageLimit
      // = 200 - 50 - 50 = 100 ✓
      const skipFromOldest = Math.max(0, totalMessages - messageSkip - messageLimit)

      const response = await getAgentV2SessionMessages(
        sessionId,
        messageLimit,
        skipFromOldest,
        false // Get older messages (oldest first)
      )

      if (response.messages.length > 0) {
        // Convert API messages to ChatMessage format
        const olderMessages: ChatMessage[] = response.messages.map((msg) => ({
          id: `${msg.role}-${msg.sequence}`,
          role: msg.role as 'user' | 'assistant',
          contents: msg.content_blocks as MessageContent[],
          timestamp: new Date(msg.created_at),
        }))

        // Prepend older messages to the beginning (they're already in chronological order)
        setMessages((prev) => [...olderMessages, ...prev])
        setMessageSkip((prev) => prev + response.messages.length)
      } else {
        // No more messages to load
        setMessageSkip(totalMessages)
      }
    } catch (err: any) {
      console.error('Failed to load older messages:', err)
      setError(`Failed to load older messages: ${err.message}`)
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }, [sessionId, messageSkip, totalMessages, messageLimit, isLoadingOlderMessages])

  const startNewSession = useCallback(() => {
    setMessages([])
    setSessionId(null)
    currentMessageRef.current = null
    setError(null)
    setMessageSkip(0)
    setTotalMessages(0)
    abortControllerRef.current?.abort()
  }, [])

  const switchToSession = useCallback(
    async (newSessionId: string) => {
      // Abort any ongoing request
      abortControllerRef.current?.abort()

      // Clear current state
      setMessages([])
      currentMessageRef.current = null
      setIsStreaming(false)
      setMessageSkip(0)
      setTotalMessages(0)

      // Load session history
      await loadSessionHistory(newSessionId)
    },
    [loadSessionHistory]
  )

  const deleteSession = useCallback(
    async (sessionIdToDelete: string) => {
      try {
        await deleteAgentV2Session(sessionIdToDelete)

        // If deleted session is current session, clear it
        if (sessionIdToDelete === sessionId) {
          startNewSession()
        }

        // Reload sessions list (reset pagination)
        await loadAvailableSessions(true)
      } catch (err: any) {
        setError(`Failed to delete session: ${err.message}`)
      }
    },
    [sessionId, startNewSession, loadAvailableSessions]
  )

  const renameSession = useCallback(
    async (sessionIdToRename: string, newTitle: string) => {
      try {
        await renameAgentV2Session(sessionIdToRename, newTitle)

        // Update local state
        setAvailableSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.claude_session_id === sessionIdToRename
              ? {
                  ...session,
                  metadata: {
                    ...session.metadata,
                    title: newTitle,
                  },
                }
              : session
          )
        )
      } catch (err: any) {
        setError(`Failed to rename session: ${err.message}`)
        throw err
      }
    },
    []
  )

  const sendMessage = useCallback(
    (text: string) => {
      try {
        // Abort any ongoing request
        abortControllerRef.current?.abort()

        // Add user message immediately
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          contents: [
            {
              type: 'text',
              content: text,
              timestamp: new Date(),
            },
          ],
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])

        // Initialize a new assistant message for streaming response
        currentMessageRef.current = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          contents: [],
          timestamp: new Date(),
        }

        setIsStreaming(true)
        setError(null)

        // Set up abort controller for this request
        abortControllerRef.current = new AbortController()

        // Start SSE streaming
        chatInAgentV2(
          sessionId,
          text,
          (data: AgentV2SSEEventUnion) => {
            // Handle session_created event
            if (data.type === 'session_created') {
              if (data.session_id) {
                setSessionId(data.session_id)
                localStorage.setItem('lastAgentV2SessionId', data.session_id)
                console.log('Session created with ID:', data.session_id)
                loadAvailableSessions(true)
              }
              return
            }

            // Handle session_title_generated event
            if (data.type === 'session_title_generated') {
              const titleEvent = data as any
              setAvailableSessions((prevSessions) =>
                prevSessions.map((session) =>
                  session.claude_session_id === titleEvent.session_id
                    ? {
                        ...session,
                        metadata: {
                          ...session.metadata,
                          title: titleEvent.title,
                        },
                      }
                    : session
                )
              )
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
            if (
              currentMessageRef.current &&
              (data.type === 'text' ||
                data.type === 'thinking' ||
                data.type === 'tool_use' ||
                data.type === 'tool_result')
            ) {
              const newContent: MessageContent = {
                type: data.type,
                content: (data as any).content || '',
                timestamp: new Date(),
                ...((data as any).toolName && { toolName: (data as any).toolName }),
                ...((data as any).toolInput && { toolInput: (data as any).toolInput }),
                ...((data as any).todos && { todos: (data as any).todos }),
                ...((data as any).toolCallId && { toolCallId: (data as any).toolCallId }),
              } as MessageContent

              // For streaming text/thinking, append to the last content of the same type
              if (data.type === 'text' || data.type === 'thinking') {
                const lastContent =
                  currentMessageRef.current.contents[
                    currentMessageRef.current.contents.length - 1
                  ]

                if (
                  lastContent &&
                  lastContent.type === data.type &&
                  'content' in lastContent
                ) {
                  // Append to existing content
                  lastContent.content += (data as any).content || ''
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
              setMessages((prev) => {
                const updated = [...prev]
                const existingIndex = updated.findIndex(
                  (m) => m.id === currentMessage.id
                )

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
            setError(`Stream error: ${err.message || 'Unknown error'}`)
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
    },
    [sessionId, loadAvailableSessions]
  )

  // Load sessions on mount
  useEffect(() => {
    loadAvailableSessions(true)

    // Check for last session and load it
    const lastSessionId = localStorage.getItem('lastAgentV2SessionId')
    if (lastSessionId) {
      switchToSession(lastSessionId).catch((err) => {
        console.error('Failed to load last session:', err)
        // Clear invalid session ID
        localStorage.removeItem('lastAgentV2SessionId')
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasMoreSessions = sessionSkip < totalSessions
  const hasMoreMessages = sessionId ? messageSkip < totalMessages : false

  return {
    messages,
    isStreaming,
    isLoadingHistory,
    error,
    sessionId,
    availableSessions,
    hasMoreSessions,
    isLoadingMoreSessions,
    hasMoreMessages,
    isLoadingOlderMessages,
    sendMessage,
    startNewSession,
    switchToSession,
    loadAvailableSessions: () => loadAvailableSessions(true),
    loadMoreSessions,
    loadOlderMessages,
    deleteSession,
    renameSession,
  }
}

