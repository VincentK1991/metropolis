export type MessageContentType = 'user' | 'thinking' | 'text' | 'tool_use' | 'tool_result'

export interface BaseMessageContent {
  type: MessageContentType
  content: string
  timestamp: Date
}

export interface ThinkingContent {
  type: 'thinking'
  content: string
  timestamp: Date
}

export interface TextContent {
  type: 'text'
  content: string
  timestamp: Date
}

export interface ToolUseContent {
  type: 'tool_use'
  toolName: string
  toolInput: any
  timestamp: Date
}

export interface ToolResultContent {
  type: 'tool_result'
  content: string
  toolCallId?: string
  timestamp: Date
}

export interface TodoItem {
  status: 'pending' | 'in_progress' | 'completed'
  content: string
  id?: string
}

export interface TodoContent extends ToolUseContent {
  toolName: 'TodoWrite'
  todos: TodoItem[]
}

export type MessageContent = ThinkingContent | TextContent | ToolUseContent | ToolResultContent | TodoContent

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  contents: MessageContent[]
  timestamp: Date
}

export interface WebSocketMessage {
  type: MessageContentType | 'complete' | 'error'
  content?: string
  toolName?: string
  toolInput?: any
  todos?: TodoItem[]
  toolCallId?: string
  message?: string
}

