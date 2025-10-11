import { useState, useEffect, useCallback, useRef } from 'react'
import { agentService } from '../api/agentService'
import { ChatMessage, MessageContent, WebSocketMessage } from '../types/chat'

interface UseAgentChatResult {
  messages: ChatMessage[]
  isConnected: boolean
  isStreaming: boolean
  error: string | null
  sendMessage: (text: string) => void
  connect: () => Promise<void>
  disconnect: () => void
}

export const useAgentChat = (): UseAgentChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use ref to track current streaming message
  const currentMessageRef = useRef<ChatMessage | null>(null)

  const connect = useCallback(async () => {
    try {
      await agentService.connect()
      setIsConnected(true)
      setError(null)
    } catch (err) {
      setError('Failed to connect to agent service')
      setIsConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    agentService.disconnect()
    setIsConnected(false)
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
      agentService.sendMessage(text)
    } catch (err) {
      setError('Failed to send message')
      setIsStreaming(false)
    }
  }, [isConnected])

  useEffect(() => {
    const unsubscribeMessage = agentService.onMessage((message: WebSocketMessage) => {
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
      if (currentMessageRef.current) {
        const newContent: MessageContent = {
          type: message.type as any,
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

    const unsubscribeError = agentService.onError((error) => {
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
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages,
    isConnected,
    isStreaming,
    error,
    sendMessage,
    connect,
    disconnect,
  }
}

