import type { ChatMessage as ChatMessageType } from '../types/chat'
import { MessageContentRenderer } from './common/MessageContentRenderer'

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user'

  if (isUser) {
    // Simple user message rendering
    const textContent = message.contents.find(c => c.type === 'text')
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="rounded-2xl dark:rounded-lg px-4 py-3 glass-message-user text-gray-900 dark:text-white transition-all duration-300">
            <div className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">You</div>
            <div className="text-base whitespace-pre-wrap break-words">
              {textContent?.content || ''}
            </div>
            <div className="text-xs mt-1 text-gray-600 dark:text-gray-300">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message with multiple content types
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="rounded-2xl dark:rounded-lg px-4 py-3 glass-message-assistant transition-all duration-300">
          <div className="text-sm font-semibold mb-2 text-nouveau-sage-500 dark:text-deco-gold">Assistant</div>

          {/* Render each content block */}
          {message.contents.map((content, index) => (
            <MessageContentRenderer key={index} content={content} />
          ))}

          <div className="text-xs mt-2 text-gray-400 dark:text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}
