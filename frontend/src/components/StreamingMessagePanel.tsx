import { useRef, useEffect, type ComponentType } from 'react'

interface StreamingMessagePanelProps {
  messages: unknown[]
  error: string | null
  messageRenderer: ComponentType<{ message: unknown }>
  emptyStateIcon?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  hasMoreMessages?: boolean
  isLoadingOlderMessages?: boolean
  onLoadOlderMessages?: () => void
}

export const StreamingMessagePanel = ({
  messages,
  error,
  messageRenderer: MessageRenderer,
  emptyStateIcon = '💬',
  emptyStateTitle = 'Start a conversation',
  emptyStateDescription = 'Type a message below to begin',
  hasMoreMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
}: StreamingMessagePanelProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLengthRef = useRef<number>(0)
  const previousScrollHeightRef = useRef<number>(0)
  const isUserScrollingRef = useRef<boolean>(false)

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100

      if (isNearBottom || previousMessagesLengthRef.current === 0) {
        container.scrollTop = container.scrollHeight
      }
    }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Check if messages were prepended (loading older messages)
    const messagesWerePrepended =
      messages.length > previousMessagesLengthRef.current &&
      previousMessagesLengthRef.current > 0

    if (messagesWerePrepended && previousScrollHeightRef.current > 0) {
      // Preserve scroll position when prepending older messages
      const scrollDiff = container.scrollHeight - previousScrollHeightRef.current
      container.scrollTop = container.scrollTop + scrollDiff
    } else {
      // Normal scroll to bottom for new messages
      scrollToBottom()
    }

    previousMessagesLengthRef.current = messages.length
    previousScrollHeightRef.current = container.scrollHeight
  }, [messages])

  // Detect scroll to top for loading older messages
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !hasMoreMessages || !onLoadOlderMessages || isLoadingOlderMessages) {
      return
    }

    const handleScroll = () => {
      const { scrollTop } = container
      // Load older messages when within 200px of top
      if (scrollTop < 200 && !isLoadingOlderMessages) {
        onLoadOlderMessages()
      }
    }

    // Throttle scroll events
    let timeoutId: NodeJS.Timeout | null = null
    const throttledHandleScroll = () => {
      if (timeoutId) return
      timeoutId = setTimeout(() => {
        handleScroll()
        timeoutId = null
      }, 200)
    }

    container.addEventListener('scroll', throttledHandleScroll)
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden p-4 space-y-4 glass-scrollbar min-h-0"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Loading Older Messages Indicator */}
        {hasMoreMessages && (
          <div className="text-center py-2">
            {isLoadingOlderMessages ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Loading older messages...
              </div>
            ) : (
              <button
                onClick={onLoadOlderMessages}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Load Older Messages
              </button>
            )}
          </div>
        )}

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
    </div>
  )
}
