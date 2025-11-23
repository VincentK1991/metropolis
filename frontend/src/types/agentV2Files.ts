/**
 * TypeScript types for Agent V2 file operations.
 */

/**
 * File or directory item from directory listing.
 */
export interface AgentV2FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number | null
  modified: number // Unix timestamp
}

/**
 * Directory listing response from API.
 */
export interface AgentV2DirectoryListing {
  path: string
  absolute_path: string
  items: AgentV2FileItem[]
}

/**
 * File upload response from API.
 */
export interface AgentV2FileUploadResponse {
  message: string
  file: {
    name: string
    path: string
    absolute_path: string
    type: 'file' | 'directory'
    size: number | null
    modified: number
    created?: number
  }
}

/**
 * Generic file operation response (delete, rename, create directory).
 */
export interface AgentV2FileOperationResponse {
  message: string
  path?: string
  [key: string]: unknown
}



