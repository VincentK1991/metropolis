/**
 * Card component for rendering workflow execution events.
 * Uses shared content block components for consistent styling with ChatMessage.
 * Handles different event types: start, thinking, text, tool_use, tool_result, complete, error
 */

import { MessageContentRenderer } from './common/MessageContentRenderer'
import type { TodoItem } from '../types/chat'

interface ExecutionEventCardProps {
  message: unknown
}

export function ExecutionEventCard({ message }: ExecutionEventCardProps) {
  const event = message as {
    type: string
    data?: { type?: string; content?: string; toolName?: string; toolInput?: unknown; todos?: TodoItem[] }
    content?: string
    toolName?: string
    toolInput?: unknown
    artifact_paths?: string[]
  }

  // Special handling for 'start' event
  if (event.type === 'start') {
    return (
      <div className="rounded-2xl dark:rounded-lg px-4 py-3 backdrop-blur-sm bg-gradient-to-r from-blue-100/80 to-blue-50/80 dark:from-blue-900/40 dark:to-blue-800/40 border border-blue-300/50 dark:border-blue-600/50 shadow-md transition-all duration-300">
        <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
          🚀 Workflow execution started
        </p>
      </div>
    )
  }

  // Normalize event data structure to work with MessageContentRenderer
  // Check if event has data property or is the message directly
  const msgData = event.data || event

  if (msgData && typeof msgData === 'object' && 'type' in msgData) {
    // Render using shared content renderer with unified styling
    return (
      <div className="rounded-2xl dark:rounded-lg px-4 py-3 backdrop-blur-md bg-white/60 dark:bg-deco-navy/40 border border-nouveau-lavender-200/50 dark:border-deco-gold/20 shadow-md transition-all duration-300">
        <MessageContentRenderer content={msgData} />
      </div>
    )
  }

  return null
}
