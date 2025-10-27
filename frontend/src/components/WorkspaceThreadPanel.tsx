/**
 * Workspace thread chat panel using SSE streaming.
 * Reuses ChatMessage, ChatInput, and StreamingMessagePanel components.
 */

import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChatMessage as ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { StreamingMessagePanel } from './StreamingMessagePanel'
import { FileUploadButton } from './FileUploadButton'
import { FileListPanel } from './FileListPanel'
import { useWorkspaceThreadContext } from '../contexts/WorkspaceThreadContext'
import { useFileList } from '../hooks/useFileList'
import type { ChatMessage } from '../types/chat'

// Wrapper to adapt ChatMessage component to StreamingMessagePanel's interface
const ChatMessageRenderer = ({ message }: { message: unknown }) => {
  return <ChatMessageComponent message={message as ChatMessage} />
}

interface WorkspaceThreadPanelProps {
  workspaceId: string
  threadId: string
}

export const WorkspaceThreadPanel = ({ workspaceId, threadId }: WorkspaceThreadPanelProps) => {
  const navigate = useNavigate()
  const {
    messages,
    isStreaming,
    isLoadingHistory,
    error,
    sendMessage,
    resetThread,
    setWorkspaceId,
    setThreadId,
    loadThreadHistory,
    setOnThreadCreated,
    threadId: currentThreadId,
  } = useWorkspaceThreadContext()

  const { uploadFile, refreshFiles } = useFileList(workspaceId, threadId)

  // Set workspace and thread IDs when component mounts
  useEffect(() => {
    setWorkspaceId(workspaceId)

    if (threadId !== 'pending') {
      setThreadId(threadId)
      // Load thread history for existing threads
      loadThreadHistory(workspaceId, threadId)
    } else {
      // Reset thread state for new/pending thread
      resetThread()
      setThreadId(null)

      // Set up callback to navigate when thread is created
      setOnThreadCreated((newThreadId: string) => {
        navigate({
          to: '/workspace/$workspaceId/$threadId',
          params: { workspaceId, threadId: newThreadId },
        })
      })
    }

    // Cleanup on unmount
    return () => {
      setOnThreadCreated(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, threadId])

  const handleSendMessage = (message: string) => {
    sendMessage(message)
  }

  return (
    <div className="flex flex-col h-full backdrop-blur-xl bg-amber/70 dark:bg-deco-navy-500/70 backdrop-saturate-150 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 backdrop-blur-lg bg-gradient-to-r from-nouveau-lavender-300/60 via-nouveau-rose-300/50 to-nouveau-mint-300/60 dark:from-deco-navy-400/80 dark:via-deco-burgundy-400/70 dark:to-deco-emerald-500/80 text-gray-800 dark:text-nouveau-cream relative border-b border-white/40 dark:border-deco-gold/20">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-nouveau-rose-400/70 via-nouveau-lavender-400/70 to-nouveau-sage-400/70 dark:from-deco-gold/60 dark:via-deco-emerald/60 dark:to-deco-gold/60" />

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Link
              to="/workspace/$workspaceId"
              params={{ workspaceId }}
              className="inline-flex items-center text-nouveau-rose-600 dark:text-deco-gold hover:underline text-sm mb-2"
            >
              ← Back to workspace
            </Link>
            <h2 className="text-xl font-semibold">Workspace Thread</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {currentThreadId ? `Thread: ${currentThreadId.slice(0, 8)}...` : 'New thread'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* File List Panel */}
            <FileListPanel workspaceId={workspaceId} threadId={currentThreadId || threadId} />

            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400 dark:bg-deco-gold animate-pulse" />
                <span className="text-xs text-gray-700 dark:text-gray-300">Streaming...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Streaming Message Panel */}
      {isLoadingHistory ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nouveau-rose-400 dark:border-deco-gold mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading thread history...</p>
          </div>
        </div>
      ) : (
        <StreamingMessagePanel
          messages={messages}
          error={error}
          messageRenderer={ChatMessageRenderer}
          emptyStateTitle="Start a conversation in this workspace"
        />
      )}

      {/* Chat Input */}
      <div className="border-t border-white/40 dark:border-deco-gold/20 backdrop-blur-md bg-amber/60 dark:bg-deco-navy-400/60">
        {/* Streaming Indicator at Bottom */}
        {isStreaming && (
          <div className="px-4 pt-3 pb-2 flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-nouveau-lavender-400 dark:border-deco-gold border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Agent is thinking and responding...
            </span>
          </div>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder="Type your message..."
          leftActions={
            <FileUploadButton
              workspaceId={workspaceId}
              threadId={currentThreadId || threadId}
              onUpload={uploadFile}
              onUploadComplete={refreshFiles}
            />
          }
        />
      </div>
    </div>
  )
}

