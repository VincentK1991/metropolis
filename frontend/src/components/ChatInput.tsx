import { useState, type FormEvent } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  placeholder?: string
}

export const ChatInput = ({
  onSendMessage,
  placeholder = 'Type your message...'
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
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-2xl dark:rounded-lg border-2 border-nouveau-lavender/40 dark:border-deco-gold/40 bg-white/80 dark:bg-deco-navy-400 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-nouveau-lavender dark:focus:ring-deco-gold focus:border-transparent text-base transition-all duration-200"
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
              ? 'bg-gradient-to-br from-nouveau-lavender to-nouveau-rose dark:from-deco-emerald dark:to-deco-gold text-gray-800 dark:text-white hover:shadow-lg hover:scale-105 border-2 border-nouveau-lavender/30 dark:border-deco-gold/50'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-2 border-gray-300 dark:border-gray-600'
          }`}
        >
          Send
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Press <kbd className="px-1.5 py-0.5 bg-nouveau-cream dark:bg-deco-navy-400 border border-nouveau-sage/40 dark:border-deco-silver/40 rounded">Enter</kbd> to send,
        <kbd className="px-1.5 py-0.5 bg-nouveau-cream dark:bg-deco-navy-400 border border-nouveau-sage/40 dark:border-deco-silver/40 rounded ml-1">Shift+Enter</kbd> for new line
      </div>
    </form>
  )
}

