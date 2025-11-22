/**
 * Context for Agent V2 chat using SSE streaming.
 */

import React, { createContext, useContext, type ReactNode } from 'react'
import { useAgentV2Chat } from '../hooks/useAgentV2Chat'

interface AgentV2ContextType {
  messages: ReturnType<typeof useAgentV2Chat>['messages']
  isStreaming: ReturnType<typeof useAgentV2Chat>['isStreaming']
  isLoadingHistory: ReturnType<typeof useAgentV2Chat>['isLoadingHistory']
  error: ReturnType<typeof useAgentV2Chat>['error']
  sessionId: ReturnType<typeof useAgentV2Chat>['sessionId']
  availableSessions: ReturnType<typeof useAgentV2Chat>['availableSessions']
  hasMoreSessions: ReturnType<typeof useAgentV2Chat>['hasMoreSessions']
  isLoadingMoreSessions: ReturnType<typeof useAgentV2Chat>['isLoadingMoreSessions']
  hasMoreMessages: ReturnType<typeof useAgentV2Chat>['hasMoreMessages']
  isLoadingOlderMessages: ReturnType<typeof useAgentV2Chat>['isLoadingOlderMessages']
  sendMessage: ReturnType<typeof useAgentV2Chat>['sendMessage']
  startNewSession: ReturnType<typeof useAgentV2Chat>['startNewSession']
  switchToSession: ReturnType<typeof useAgentV2Chat>['switchToSession']
  loadAvailableSessions: ReturnType<typeof useAgentV2Chat>['loadAvailableSessions']
  loadMoreSessions: ReturnType<typeof useAgentV2Chat>['loadMoreSessions']
  loadOlderMessages: ReturnType<typeof useAgentV2Chat>['loadOlderMessages']
  deleteSession: ReturnType<typeof useAgentV2Chat>['deleteSession']
  renameSession: ReturnType<typeof useAgentV2Chat>['renameSession']
}

const AgentV2Context = createContext<AgentV2ContextType | undefined>(undefined)

export const AgentV2Provider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const chatHook = useAgentV2Chat()

  return (
    <AgentV2Context.Provider value={chatHook}>
      {children}
    </AgentV2Context.Provider>
  )
}

export const useAgentV2Context = () => {
  const context = useContext(AgentV2Context)
  if (context === undefined) {
    throw new Error('useAgentV2Context must be used within an AgentV2Provider')
  }
  return context
}

