import { ThinkingBlock, TextBlock, ToolUseBlock, ToolResultBlock } from './ContentBlocks'
import type { MessageContent, TodoContent, ToolUseContent } from '../../types/chat'

/**
 * Unified content renderer that routes content types to appropriate block components.
 * Handles both ChatMessage.contents[] format and ExecutionEvent.data format.
 */

// Flexible content type that handles various formats while maintaining type safety
type FlexibleContent = MessageContent | Record<string, unknown>

interface MessageContentRendererProps {
  content: FlexibleContent
}

export const MessageContentRenderer = ({ content }: MessageContentRendererProps) => {
  if (!content || typeof content !== 'object') return null

  // Type guard to check if content has a type property
  if (!('type' in content)) return null

  switch (content.type) {
    case 'thinking':
      return <ThinkingBlock content={'content' in content ? String(content.content) : ''} />

    case 'text':
      return <TextBlock content={'content' in content ? String(content.content) : ''} />

    case 'tool_use': {
      const toolContent = content as ToolUseContent
      // Handle TodoWrite special case
      if (toolContent.toolName === 'TodoWrite' && 'todos' in content) {
        const todoContent = content as TodoContent
        return (
          <ToolUseBlock
            toolName={todoContent.toolName}
            toolInput={todoContent.toolInput}
            todos={todoContent.todos}
          />
        )
      }
      // Regular tool use
      return (
        <ToolUseBlock
          toolName={toolContent.toolName}
          toolInput={toolContent.toolInput}
        />
      )
    }

    case 'tool_result':
      return <ToolResultBlock content={'content' in content ? String(content.content) : ''} />

    default:
      return null
  }
}

