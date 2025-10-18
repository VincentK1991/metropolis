/**
 * Type definitions for workflow functionality.
 */

export interface WorkflowRun {
  _id: string
  skill_id: string
  user_input: string
  artifact_paths: string[]
  execution_log: ExecutionMessage[]
  status: 'running' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
}

export interface ExecutionMessage {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'complete' | 'error'
  content?: string
  toolName?: string
  toolInput?: any
  timestamp: string
}

export interface WorkflowExecutionEvent {
  type: 'start' | 'message' | 'complete' | 'error'
  run_id?: string
  data?: ExecutionMessage | { run_id: string } | { error: string }
  error?: string
  artifact_paths?: string[]
}

export interface Workflow {
  _id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface WorkflowsListResponse {
  workflows?: Workflow[]
  total?: number
}

export interface WorkflowRunsListResponse {
  runs?: WorkflowRun[]
  total?: number
}
