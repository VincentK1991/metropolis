/**
 * Agent V2 chat panel using SSE streaming.
 * Reuses ChatMessage, ChatInput, and StreamingMessagePanel components.
 */

import { useState } from 'react'
import { ChatMessage as ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { StreamingMessagePanel } from './StreamingMessagePanel'
import { AgentV2SessionList } from './AgentV2SessionList'
import { AgentV2FileUploadButton } from './AgentV2FileUploadButton'
import { AgentV2FileListPanel } from './AgentV2FileListPanel'
import { useAgentV2Context } from '../contexts/AgentV2Context'
import type { ChatMessage } from '../types/chat'

// Wrapper to adapt ChatMessage component to StreamingMessagePanel's interface
const ChatMessageRenderer = ({ message }: { message: unknown }) => {
  return <ChatMessageComponent message={message as ChatMessage} />
}

export const AgentV2ChatPanel = () => {
  const [showSessionList, setShowSessionList] = useState(true)
  const {
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
    loadMoreSessions,
    loadOlderMessages,
    deleteSession,
    renameSession,
  } = useAgentV2Context()

  const handleSendMessage = (message: string) => {
    sendMessage(message)
  }

  const handleSelectSession = async (newSessionId: string) => {
    await switchToSession(newSessionId)
  }

  const handleDeleteSession = async (sessionIdToDelete: string) => {
    await deleteSession(sessionIdToDelete)
  }

  const handleRenameSession = async (sessionIdToRename: string, newTitle: string) => {
    await renameSession(sessionIdToRename, newTitle)
  }

  return (
    <div className="flex h-full glass-chat-panel-light dark:glass-chat-panel-dark overflow-hidden">
      {/* Session List Sidebar */}
      {showSessionList && (
        <AgentV2SessionList
          sessionId={sessionId}
          availableSessions={availableSessions}
          onNewSession={startNewSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          isLoading={false}
          hasMoreSessions={hasMoreSessions}
          isLoadingMoreSessions={isLoadingMoreSessions}
          onLoadMoreSessions={loadMoreSessions}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden border-l border-white/20 dark:border-white/10 transition-all duration-300 shadow-xl">
        {/* Chat Header */}
        <div className="px-6 py-4 glass-light dark:glass-dark text-gray-800 dark:text-gray-100 relative border-b border-white/20 dark:border-white/10">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Toggle Session List Button */}
              <button
                onClick={() => setShowSessionList(!showSessionList)}
                className="glass-button p-2 rounded-lg transition-colors"
                title={showSessionList ? 'Hide sessions' : 'Show sessions'}
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <div>
                <h2 className="text-xl font-semibold">Agent V2 Chat</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {sessionId
                    ? `Session: ${sessionId.slice(0, 8)}...`
                    : 'New session - start chatting'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* File Management Buttons */}
              <div className="flex items-center gap-1 relative">
                <AgentV2FileUploadButton />
                <AgentV2FileListPanel />
              </div>

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 dark:bg-yellow-500 animate-pulse" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Streaming...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Streaming Message Panel */}
        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading session history...
              </p>
            </div>
          </div>
        ) : (
          <StreamingMessagePanel
            messages={messages}
            error={error}
            messageRenderer={ChatMessageRenderer}
            emptyStateTitle="Start a conversation with Agent V2"
            hasMoreMessages={hasMoreMessages}
            isLoadingOlderMessages={isLoadingOlderMessages}
            onLoadOlderMessages={loadOlderMessages}
          />
        )}

        {/* Chat Input */}
        <div className="border-t border-white/20 dark:border-white/10 glass-chat-panel-light dark:glass-chat-panel-dark">
          {/* Streaming Indicator at Bottom */}
          {isStreaming && (
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Agent is thinking and responding...
              </span>
            </div>
          )}

          <ChatInput
            onSendMessage={handleSendMessage}
            placeholder="Type your message..."
          />
        </div>
      </div>
    </div>
  )
}

