import { useState, useEffect, useCallback, useRef } from 'react'
import { agentService } from '../api/agentService'
import type { ChatMessage, MessageContent, WebSocketMessage, HistoricalMessage } from '../types/chat'
import type { SessionInfo } from '../types/session'

interface UseAgentChatResult {
  messages: ChatMessage[]
  isConnected: boolean
  isStreaming: boolean
  error: string | null
  sessionId: string | null
  isLoadingHistory: boolean
  availableSessions: SessionInfo[]
  sendMessage: (text: string) => void
  connect: () => Promise<void>
  disconnect: () => void
  startNewSession: () => Promise<void>
  switchToSession: (sessionId: string) => Promise<void>
  loadAvailableSessions: () => Promise<void>
}

export const useAgentChat = (): UseAgentChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [availableSessions, setAvailableSessions] = useState<SessionInfo[]>([])

  // Use ref to track current streaming message
  const currentMessageRef = useRef<ChatMessage | null>(null)

  const connect = useCallback(async () => {
    try {
      await agentService.connect()
      setIsConnected(true)
      setError(null)
    } catch {
      setError('Failed to connect to agent service')
      setIsConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    agentService.disconnect()
    setIsConnected(false)
  }, [])

  const loadAvailableSessions = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8088/api/sessions')
      const data = await response.json()
      setAvailableSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }, [])

  const startNewSession = useCallback(async () => {
    // Clear messages immediately
    setMessages([])
    currentMessageRef.current = null
    setSessionId(null)
    localStorage.removeItem('lastSessionId')

    // Disconnect current WS
    agentService.disconnect()
    setIsConnected(false)

    // Connect new WS
    try {
      await agentService.connect()
      setIsConnected(true)
      setError(null)

      // Don't send init_session for new sessions
      // The first query will create the session
    } catch {
      setError('Failed to connect to agent service')
      setIsConnected(false)
    }
  }, [])

  const switchToSession = useCallback(async (newSessionId: string) => {
    // Clear messages immediately
    setMessages([])
    currentMessageRef.current = null
    setIsLoadingHistory(true)

    // Disconnect current WS
    agentService.disconnect()
    setIsConnected(false)

    // Connect new WS
    try {
      await agentService.connect()
      setIsConnected(true)
      setError(null)

      // Send init_session for the selected session
      agentService.sendInitSession(newSessionId)
    } catch {
      setError('Failed to connect to agent service')
      setIsConnected(false)
      setIsLoadingHistory(false)
    }
  }, [])

  const sendMessage = useCallback((text: string) => {
    if (!isConnected) {
      setError('Not connected to agent service')
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
      agentService.sendMessage(text, sessionId)
    } catch {
      setError('Failed to send message')
      setIsStreaming(false)
    }
  }, [isConnected, sessionId])

  useEffect(() => {
    const unsubscribeMessage = agentService.onMessage((message: WebSocketMessage) => {
      // Handle session_created message (new session with first query)
      if (message.type === 'session_created') {
        if (message.session_id) {
          setSessionId(message.session_id)
          localStorage.setItem('lastSessionId', message.session_id)
          console.log('Session created with ID:', message.session_id)
          loadAvailableSessions()
        }
        return
      }

      // Handle session_ready message (resumed session)
      if (message.type === 'session_ready') {
        if (message.claude_session_id) {
          setSessionId(message.claude_session_id)
          localStorage.setItem('lastSessionId', message.claude_session_id)
        }

        // Load historical messages
        if (message.messages && message.messages.length > 0) {
          const historicalMessages = message.messages.map((msg: HistoricalMessage): ChatMessage => ({
            id: `${msg.role}-${msg.sequence}`,
            role: msg.role,
            contents: msg.content_blocks,
            timestamp: new Date(msg.created_at),
          }))
          setMessages(historicalMessages)
        }

        setIsLoadingHistory(false)
        loadAvailableSessions()
        return
      }

      if (message.type === 'complete') {
        // Finalize the current message
        // Note: The message is already in the messages array from streaming updates
        // We just need to clean up the ref
        currentMessageRef.current = null
        setIsStreaming(false)
        return
      }

      if (message.type === 'error') {
        setError(message.message || 'An error occurred')
        setIsStreaming(false)
        return
      }

      // Add content to current streaming message
      if (currentMessageRef.current &&
          (message.type === 'text' || message.type === 'thinking' ||
           message.type === 'tool_use' || message.type === 'tool_result')) {
        const newContent: MessageContent = {
          type: message.type,
          content: message.content || '',
          timestamp: new Date(),
          ...(message.toolName && { toolName: message.toolName }),
          ...(message.toolInput && { toolInput: message.toolInput }),
          ...(message.todos && { todos: message.todos }),
          ...(message.toolCallId && { toolCallId: message.toolCallId }),
        } as MessageContent

        // For streaming text/thinking, append to the last content of the same type
        if (message.type === 'text' || message.type === 'thinking') {
          const lastContent = currentMessageRef.current.contents[currentMessageRef.current.contents.length - 1]

          if (lastContent && lastContent.type === message.type) {
            // Append to existing content
            lastContent.content += message.content || ''
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
    })

    const unsubscribeError = agentService.onError(() => {
      setError('WebSocket connection error')
      setIsConnected(false)
      setIsStreaming(false)
    })

    const unsubscribeClose = agentService.onClose(() => {
      setIsConnected(false)
      setIsStreaming(false)
    })

    const unsubscribeOpen = agentService.onOpen(() => {
      setIsConnected(true)
      setError(null)
    })

    return () => {
      unsubscribeMessage()
      unsubscribeError()
      unsubscribeClose()
      unsubscribeOpen()
    }
  }, [loadAvailableSessions])

  // Auto-connect and initialize session on mount
  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        await agentService.connect()
        if (isMounted) {
          setIsConnected(true)
          setError(null)

          // Always load available sessions on initial connection
          await loadAvailableSessions()

          // Check for existing session and initialize
          const lastSessionId = localStorage.getItem('lastSessionId')
          if (lastSessionId) {
            // Resume last session
            agentService.sendInitSession(lastSessionId)
          }
          // For new sessions, don't send init_session
          // The first query will create the session
        }
      } catch {
        if (isMounted) {
          setError('Failed to connect to agent service')
          setIsConnected(false)
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
      agentService.disconnect()
    }
  }, [loadAvailableSessions]) // Include loadAvailableSessions in deps

  return {
    messages,
    isConnected,
    isStreaming,
    error,
    sessionId,
    isLoadingHistory,
    availableSessions,
    sendMessage,
    connect,
    disconnect,
    startNewSession,
    switchToSession,
    loadAvailableSessions,
  }
}

