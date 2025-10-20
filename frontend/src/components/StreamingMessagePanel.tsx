import { useRef, useEffect, type ComponentType } from 'react'

interface StreamingMessagePanelProps {
  messages: unknown[]
  error: string | null
  messageRenderer: ComponentType<{ message: unknown }>
  emptyStateIcon?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
}

export const StreamingMessagePanel = ({
  messages,
  error,
  messageRenderer: MessageRenderer,
  emptyStateIcon = '💬',
  emptyStateTitle = 'Start a conversation',
  emptyStateDescription = 'Type a message below to begin'
}: StreamingMessagePanelProps) => {
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

  return (
    <>
      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 backdrop-blur-sm bg-gradient-to-b from-transparent via-white/5 to-white/10 dark:from-transparent dark:via-black/10 dark:to-black/20 nouveau-scrollbar deco-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">{emptyStateIcon}</div>
              <div className="text-sm">
                {emptyStateTitle}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {emptyStateDescription}
              </div>
            </div>
          </div>
        )}
        {messages.map((message, index) => {
          const msgWithId = message as { id?: string }
          return (
            <MessageRenderer key={msgWithId?.id || index} message={message} />
          )
        })}
      </div>
    </>
  )
}
