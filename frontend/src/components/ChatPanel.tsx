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
    <div className="flex flex-col h-full backdrop-blur-xl bg-amber/70 dark:bg-deco-navy-500/70 backdrop-saturate-150 overflow-hidden border-l border-white/40 dark:border-deco-gold/30 transition-all duration-300 shadow-xl dark:shadow-2xl">
      {/* Chat Header */}
      <div className="px-6 py-4 backdrop-blur-lg bg-gradient-to-r from-nouveau-lavender-300/60 via-nouveau-rose-300/50 to-nouveau-mint-300/60 dark:from-deco-navy-400/80 dark:via-deco-burgundy-400/70 dark:to-deco-emerald-500/80 text-gray-800 dark:text-nouveau-cream relative border-b border-white/40 dark:border-deco-gold/20">
        {/* Decorative top border - Glass edge */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-nouveau-rose-400/70 via-nouveau-lavender-400/70 to-nouveau-sage-400/70 dark:from-deco-gold/60 dark:via-deco-emerald/60 dark:to-deco-gold/60" />

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
                  isConnected ? 'bg-nouveau-sage-400 dark:bg-deco-emerald' : 'bg-red-400'
                } animate-pulse`}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 rounded-full bg-yellow-400 dark:bg-deco-gold animate-pulse" />
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
      <div className="border-t border-white/40 dark:border-deco-gold/20 backdrop-blur-md bg-amber/60 dark:bg-deco-navy-400/60">
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
