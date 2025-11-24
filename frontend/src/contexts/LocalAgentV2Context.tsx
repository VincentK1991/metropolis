/**
 * Context for Local Agent V2 chat using SSE streaming.
 */

import React, { createContext, useContext, type ReactNode } from 'react'
import { useLocalAgentV2Chat } from '../hooks/useLocalAgentV2Chat'

interface LocalAgentV2ContextType {
  messages: ReturnType<typeof useLocalAgentV2Chat>['messages']
  isStreaming: ReturnType<typeof useLocalAgentV2Chat>['isStreaming']
  isLoadingHistory: ReturnType<typeof useLocalAgentV2Chat>['isLoadingHistory']
  error: ReturnType<typeof useLocalAgentV2Chat>['error']
  sessionId: ReturnType<typeof useLocalAgentV2Chat>['sessionId']
  availableSessions: ReturnType<typeof useLocalAgentV2Chat>['availableSessions']
  hasMoreSessions: ReturnType<typeof useLocalAgentV2Chat>['hasMoreSessions']
  isLoadingMoreSessions: ReturnType<typeof useLocalAgentV2Chat>['isLoadingMoreSessions']
  hasMoreMessages: ReturnType<typeof useLocalAgentV2Chat>['hasMoreMessages']
  isLoadingOlderMessages: ReturnType<typeof useLocalAgentV2Chat>['isLoadingOlderMessages']
  sendMessage: ReturnType<typeof useLocalAgentV2Chat>['sendMessage']
  startNewSession: ReturnType<typeof useLocalAgentV2Chat>['startNewSession']
  switchToSession: ReturnType<typeof useLocalAgentV2Chat>['switchToSession']
  loadAvailableSessions: ReturnType<typeof useLocalAgentV2Chat>['loadAvailableSessions']
  loadMoreSessions: ReturnType<typeof useLocalAgentV2Chat>['loadMoreSessions']
  loadOlderMessages: ReturnType<typeof useLocalAgentV2Chat>['loadOlderMessages']
  deleteSession: ReturnType<typeof useLocalAgentV2Chat>['deleteSession']
  renameSession: ReturnType<typeof useLocalAgentV2Chat>['renameSession']
}

const LocalAgentV2Context = createContext<LocalAgentV2ContextType | undefined>(undefined)

export const LocalAgentV2Provider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const chatHook = useLocalAgentV2Chat()

  return (
    <LocalAgentV2Context.Provider value={chatHook}>
      {children}
    </LocalAgentV2Context.Provider>
  )
}

export const useLocalAgentV2Context = () => {
  const context = useContext(LocalAgentV2Context)
  if (context === undefined) {
    throw new Error('useLocalAgentV2Context must be used within a LocalAgentV2Provider')
  }
  return context
}

