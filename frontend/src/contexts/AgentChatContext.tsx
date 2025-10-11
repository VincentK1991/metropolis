import React, { createContext, useContext, ReactNode } from 'react'
import { useAgentChat } from '../hooks/useAgentChat'
import { ChatMessage } from '../types/chat'
import { SessionInfo } from '../types/session'

interface AgentChatContextType {
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

const AgentChatContext = createContext<AgentChatContextType | undefined>(undefined)

export const AgentChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const agentChat = useAgentChat()

  return (
    <AgentChatContext.Provider value={agentChat}>
      {children}
    </AgentChatContext.Provider>
  )
}

export const useAgentChatContext = () => {
  const context = useContext(AgentChatContext)
  if (context === undefined) {
    throw new Error('useAgentChatContext must be used within an AgentChatProvider')
  }
  return context
}

