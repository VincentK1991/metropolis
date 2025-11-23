/**
 * API service for file operations in Agent V2 containerized agent workspace.
 */

import { createApiClient } from './baseApiclient'
import type {
  AgentV2DirectoryListing,
  AgentV2FileUploadResponse,
  AgentV2FileOperationResponse,
} from '../types/agentV2Files'

const api = createApiClient('/api')

/**
 * List directory contents.
 */
export const listDirectory = async (
  path: string = ''
): Promise<AgentV2DirectoryListing> => {
  const response = await api.get<AgentV2DirectoryListing>(
    `/v2/agent/files/list`,
    {
      params: path ? { path } : {},
    }
  )
  return response.data
}

/**
 * Upload a file to the workspace.
 */
export const uploadFile = async (
  file: File,
  path: string = ''
): Promise<AgentV2FileUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  if (path) {
    formData.append('path', path)
  }

  const response = await api.post<AgentV2FileUploadResponse>(
    `/v2/agent/files/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return response.data
}

/**
 * Download a file from the workspace.
 */
export const downloadFile = async (path: string): Promise<void> => {
  const response = await api.get(`/v2/agent/files/download`, {
    params: { path },
    responseType: 'blob',
  })

  // Extract filename from path
  const filename = path.split('/').pop() || 'download'

  // Create blob URL and trigger download
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Delete a file or directory from the workspace.
 */
export const deleteFile = async (
  path: string
): Promise<AgentV2FileOperationResponse> => {
  const response = await api.delete<AgentV2FileOperationResponse>(
    `/v2/agent/files/delete`,
    {
      params: { path },
    }
  )
  return response.data
}

/**
 * Rename a file or directory.
 */
export const renameFile = async (
  oldPath: string,
  newPath: string
): Promise<AgentV2FileOperationResponse> => {
  const response = await api.post<AgentV2FileOperationResponse>(
    `/v2/agent/files/rename`,
    {
      old_path: oldPath,
      new_path: newPath,
    }
  )
  return response.data
}

/**
 * Create a new directory.
 */
export const createDirectory = async (
  path: string
): Promise<AgentV2FileOperationResponse> => {
  const response = await api.post<AgentV2FileOperationResponse>(
    `/v2/agent/files/mkdir`,
    {
      path,
    }
  )
  return response.data
}



