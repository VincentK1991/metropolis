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
            className="w-full resize-none rounded-2xl dark:rounded-lg border border-white/50 dark:border-deco-gold/30 backdrop-blur-md bg-amber/70 dark:bg-deco-navy-400/70 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-white/60 dark:focus:ring-deco-gold/40 focus:border-white/70 dark:focus:border-deco-gold/50 text-base transition-all duration-200 shadow-md"
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
          className={`px-6 py-3 rounded-2xl dark:rounded-lg font-medium transition-all duration-200 ${
            input.trim()
              ? 'backdrop-blur-md bg-gradient-to-br from-nouveau-lavender-300/70 to-nouveau-rose-300/70 dark:from-deco-emerald/80 dark:to-deco-gold/80 text-gray-900 dark:text-white hover:shadow-xl hover:scale-105 border border-white/60 dark:border-deco-gold/40 shadow-lg'
              : 'backdrop-blur-sm bg-gray-200/50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300/50 dark:border-gray-600/50'
          }`}
        >
          Send
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Press <kbd className="px-1.5 py-0.5 backdrop-blur-sm bg-amber/50 dark:bg-deco-navy-400/50 border border-white/40 dark:border-deco-gold/20 rounded shadow-sm">Enter</kbd> to send,
        <kbd className="px-1.5 py-0.5 backdrop-blur-sm bg-amber/50 dark:bg-deco-navy-400/50 border border-white/40 dark:border-deco-gold/20 rounded ml-1 shadow-sm">Shift+Enter</kbd> for new line
      </div>
    </form>
  )
}

