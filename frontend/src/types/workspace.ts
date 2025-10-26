/**
 * TypeScript types for workspace and thread management.
 */

import { SessionInfo } from './session'

/**
 * Skill summary for workspace display.
 */
export interface SkillSummary {
  _id: string
  title: string
}

/**
 * Workspace model.
 */
export interface Workspace {
  _id: string
  name: string
  description: string
  skill_ids: string[]
  skills?: SkillSummary[]
  created_at: string
  updated_at: string
}

/**
 * Workspace thread (extends session).
 */
export interface WorkspaceThread extends SessionInfo {
  workspace_id?: string
}

/**
 * Request to create a workspace.
 */
export interface CreateWorkspaceRequest {
  name: string
  description?: string
  skill_ids?: string[]
}

/**
 * Request to update a workspace.
 */
export interface UpdateWorkspaceRequest {
  name?: string
  description?: string
  skill_ids?: string[]
}

/**
 * Request to create a thread.
 */
export interface CreateThreadRequest {
  title?: string
}

/**
 * Chat message request.
 */
export interface ChatRequest {
  message: string
}

