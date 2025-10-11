import { useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useAgentChat } from '../hooks/useAgentChat'

export const ChatPanel = () => {
  const { messages, isConnected, isStreaming, error, sendMessage } = useAgentChat()
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
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Claude Agent Assistant</h2>
            <p className="text-sm text-blue-100 mt-1">
              {isConnected ? 'Connected and ready' : 'Connecting...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                } animate-pulse`}
              />
              <span className="text-xs text-blue-100">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs text-blue-100">Streaming...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-sm">
                Start a conversation with the Claude Agent
              </div>
              <div className="text-xs text-gray-400 mt-1">
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
      <div className="border-t border-gray-200 bg-white">
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
