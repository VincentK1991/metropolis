/**
 * API service for file upload/download in workspace threads.
 */

import { createApiClient } from './baseApiclient'

const api = createApiClient('/api')

export interface FileMetadata {
  filename: string
  file_size: number
  file_type: string
  mime_type: string
  uploaded_at: string
  uploaded_by?: string
  is_tracked: boolean
}

/**
 * Upload a file to a workspace thread's execution environment.
 */
export const uploadFile = async (
  workspaceId: string,
  threadId: string,
  file: File
): Promise<FileMetadata> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(
    `/workspaces/${workspaceId}/threads/${threadId}/files/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data.file
}

/**
 * List all files in a workspace thread's execution environment.
 */
export const listFiles = async (
  workspaceId: string,
  threadId: string
): Promise<FileMetadata[]> => {
  const response = await api.get(
    `/workspaces/${workspaceId}/threads/${threadId}/files`
  )
  return response.data.files
}

/**
 * Download a file from a workspace thread's execution environment.
 */
export const downloadFile = async (
  workspaceId: string,
  threadId: string,
  filename: string
): Promise<void> => {
  const response = await api.get(
    `/workspaces/${workspaceId}/threads/${threadId}/files/${encodeURIComponent(filename)}`,
    {
      responseType: 'blob',
    }
  )

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
 * Delete a file from a workspace thread's execution environment.
 */
export const deleteFile = async (
  workspaceId: string,
  threadId: string,
  filename: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(
    `/workspaces/${workspaceId}/threads/${threadId}/files/${encodeURIComponent(filename)}`
  )
  return response.data
}

