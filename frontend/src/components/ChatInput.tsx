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
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            style={{
              minHeight: '48px',
              maxHeight: '150px',
              height: 'auto',
            }}
          />

          {/* Character count indicator (optional) */}
          {input.length > 0 && (
            <div className="absolute bottom-2 right-3 text-xs text-gray-400">
              {input.length}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim()}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            input.trim()
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Send
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to send,
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded ml-1">Shift+Enter</kbd> for new line
      </div>
    </form>
  )
}

