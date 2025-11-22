import type { MessageContent } from './chat'

/**
 * Agent V2 Session information from the API
 */
export interface AgentV2Session {
  _id?: string
  claude_session_id: string
  created_at: string
  updated_at: string
  message_count: number
  metadata?: {
    title?: string
    tags?: string[]
    user_id?: string
  }
  is_active: boolean
  total_cost_usd?: number
  total_input_tokens?: number
  total_output_tokens?: number
}

/**
 * Paginated response for sessions
 */
export interface PaginatedSessionsResponse {
  sessions: AgentV2Session[]
  total: number
  limit: number
  skip: number
}

/**
 * Paginated response for messages
 */
export interface PaginatedMessagesResponse {
  messages: AgentV2Message[]
  total: number
  limit: number
  skip: number
}

/**
 * Agent V2 Message from the API (similar to HistoricalMessage)
 */
export interface AgentV2Message {
  _id?: string
  session_id: string
  sequence: number
  role: 'user' | 'assistant'
  content_blocks: MessageContent[]
  created_at: string
  duration_ms?: number
  cost_usd?: number
  input_tokens?: number
  output_tokens?: number
}

/**
 * SSE Event types from Agent V2 API
 */
export type AgentV2SSEEventType =
  | 'session_created'
  | 'session_title_generated'
  | 'text'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'complete'
  | 'error'

/**
 * Base SSE Event structure
 */
export interface AgentV2SSEEvent {
  type: AgentV2SSEEventType
}

/**
 * Session created event
 */
export interface SessionCreatedEvent extends AgentV2SSEEvent {
  type: 'session_created'
  session_id: string
}

/**
 * Session title generated event
 */
export interface SessionTitleGeneratedEvent extends AgentV2SSEEvent {
  type: 'session_title_generated'
  session_id: string
  title: string
}

/**
 * Text content event
 */
export interface TextEvent extends AgentV2SSEEvent {
  type: 'text'
  content: string
}

/**
 * Thinking content event
 */
export interface ThinkingEvent extends AgentV2SSEEvent {
  type: 'thinking'
  content: string
}

/**
 * Tool use event
 */
export interface ToolUseEvent extends AgentV2SSEEvent {
  type: 'tool_use'
  toolName: string
  toolInput?: any
  todos?: Array<{
    status: 'pending' | 'in_progress' | 'completed'
    content: string
    id?: string
  }>
}

/**
 * Tool result event
 */
export interface ToolResultEvent extends AgentV2SSEEvent {
  type: 'tool_result'
  content: string
  toolCallId?: string
}

/**
 * Complete event
 */
export interface CompleteEvent extends AgentV2SSEEvent {
  type: 'complete'
}

/**
 * Error event
 */
export interface ErrorEvent extends AgentV2SSEEvent {
  type: 'error'
  error: string
}

/**
 * Union type for all SSE events
 */
export type AgentV2SSEEventUnion =
  | SessionCreatedEvent
  | SessionTitleGeneratedEvent
  | TextEvent
  | ThinkingEvent
  | ToolUseEvent
  | ToolResultEvent
  | CompleteEvent
  | ErrorEvent

