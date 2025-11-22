import { ChatMessage as ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { StreamingMessagePanel } from './StreamingMessagePanel'
import { useAgentChatContext } from '../contexts/AgentChatContext'
import type { ChatMessage } from '../types/chat'

// Wrapper to adapt ChatMessage component to StreamingMessagePanel's interface
const ChatMessageRenderer = ({ message }: { message: unknown }) => {
  return <ChatMessageComponent message={message as ChatMessage} />
}

export const ChatPanel = () => {
  const { messages, isConnected, isStreaming, error, sendMessage, sessionId } = useAgentChatContext()

  const handleSendMessage = (message: string) => {
    if (!isConnected) {
      console.error('Not connected to agent service')
      return
    }
    sendMessage(message)
  }

  return (
    <div className="flex flex-col h-full glass-chat-panel-light dark:glass-chat-panel-dark overflow-hidden border-l border-white/20 dark:border-white/10 transition-all duration-300 shadow-xl">
      {/* Chat Header */}
      <div className="px-6 py-4 glass-light dark:glass-dark text-gray-800 dark:text-gray-100 relative border-b border-white/20 dark:border-white/10">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Chat with Metropolis</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {isConnected ? 'Connected and ready' : 'Connecting...'}
            </p>
            {sessionId && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                Session: {sessionId}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 dark:bg-green-500' : 'bg-red-400'
                } animate-pulse`}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 rounded-full bg-yellow-400 dark:bg-yellow-500 animate-pulse" />
                <span className="text-xs text-gray-700 dark:text-gray-300">Streaming...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Streaming Message Panel */}
      <StreamingMessagePanel
        messages={messages}
        error={error}
        messageRenderer={ChatMessageRenderer}
        emptyStateTitle="Start a conversation with the Claude Agent"
      />

      {/* Chat Input */}
      <div className="border-t border-white/20 dark:border-white/10 glass-chat-panel-light dark:glass-chat-panel-dark">
        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder={
            isConnected
              ? 'Type your message...'
              : 'Waiting for connection...'
          }
        />
      </div>
    </div>
  )
}
