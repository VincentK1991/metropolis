import { useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useAgentChatContext } from '../contexts/AgentChatContext'

export const ChatPanel = () => {
  const { messages, isConnected, isStreaming, error, sendMessage, sessionId } = useAgentChatContext()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (message: string) => {
    if (!isConnected) {
      console.error('Not connected to agent service')
      return
    }
    sendMessage(message)
  }

  return (
    <div className="flex flex-col h-full bg-nouveau-cream dark:bg-deco-navy-500 shadow-xl dark:shadow-2xl overflow-hidden border-l-4 border-nouveau-lavender/60 dark:border-deco-gold/40 transition-all duration-300">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-nouveau-lavender/80 via-nouveau-rose/70 to-nouveau-mint/80 dark:from-deco-navy dark:via-deco-burgundy dark:to-deco-emerald-500 text-gray-800 dark:text-nouveau-cream relative">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-nouveau-rose-400 via-nouveau-lavender-400 to-nouveau-sage-400 dark:from-deco-gold dark:via-deco-emerald dark:to-deco-gold" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Claude Agent Assistant</h2>
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

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-nouveau-cream-100 via-nouveau-lavender/15 to-nouveau-rose/10 dark:bg-deco-navy/60 nouveau-scrollbar deco-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-sm">
                Start a conversation with the Claude Agent
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Type a message below to begin
              </div>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Chat Input */}
      <div className="border-t-4 border-nouveau-lavender/50 dark:border-deco-gold/30 bg-nouveau-cream-50 dark:bg-deco-navy-400">
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
