import { useState, type FormEvent, type ReactNode } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  placeholder?: string
  leftActions?: ReactNode
}

export const ChatInput = ({
  onSendMessage,
  placeholder = 'Type your message...',
  leftActions,
}: ChatInputProps) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const trimmedInput = input.trim()
    if (!trimmedInput) return

    onSendMessage(trimmedInput)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-3 items-end">
        {/* Left Actions (e.g., file upload button) */}
        {leftActions && <div className="flex-shrink-0">{leftActions}</div>}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-xl border border-white/25 dark:border-white/15 glass-light dark:glass-dark text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-white/40 dark:focus:border-white/20 text-base transition-all duration-200 shadow-md"
            style={{
              minHeight: '48px',
              maxHeight: '150px',
              height: 'auto',
            }}
          />

          {/* Character count indicator (optional) */}
          {input.length > 0 && (
            <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-500">
              {input.length}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim()}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            input.trim()
              ? 'glass-button text-gray-900 dark:text-gray-100 hover:shadow-xl hover:scale-105'
              : 'backdrop-blur-sm bg-gray-200/30 dark:bg-gray-700/30 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300/30 dark:border-gray-600/30'
          }`}
        >
          Send
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Press <kbd className="px-1.5 py-0.5 glass-light dark:glass-dark rounded shadow-sm text-xs">Enter</kbd> to send,
        <kbd className="px-1.5 py-0.5 glass-light dark:glass-dark rounded ml-1 shadow-sm text-xs">Shift+Enter</kbd> for new line
      </div>
    </form>
  )
}

