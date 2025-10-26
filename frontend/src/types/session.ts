/**
 * TypeScript types for session management.
 */

export interface SessionMetadata {
  title?: string | null
  tags: string[]
  user_id?: string | null
}

export interface SessionInfo {
  _id?: string
  claude_session_id: string
  created_at: string
  updated_at: string
  message_count: number
  metadata: SessionMetadata
  is_active: boolean
  total_cost_usd?: number
  total_input_tokens?: number
  total_output_tokens?: number
}

export interface SessionReadyMessage {
  type: 'session_ready'
  claude_session_id: string
  messages: Array<{
    _id: string
    session_id: string
    sequence: number
    role: 'user' | 'assistant'
    content_blocks: Array<Record<string, any>>
    created_at: string
    duration_ms?: number
  }>
}

export interface InitSessionMessage {
  type: 'init_session'
  claude_session_id: string | null
}

export interface ClaudeAgentMessage {
  _id?: string
  session_id: string
  sequence: number
  role: 'user' | 'assistant'
  content_blocks: Array<Record<string, any>>
  created_at: string
  duration_ms?: number
  cost_usd?: number
  input_tokens?: number
  output_tokens?: number
}
