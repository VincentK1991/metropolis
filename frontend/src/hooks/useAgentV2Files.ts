import { useState, useCallback } from 'react'
import {
  listDirectory,
  uploadFile,
  downloadFile,
  deleteFile,
  renameFile,
  createDirectory,
} from '../api/agentV2FileService'
import type {
  AgentV2FileItem,
  AgentV2DirectoryListing,
} from '../types/agentV2Files'

interface UseAgentV2FilesResult {
  currentPath: string
  items: AgentV2FileItem[]
  isLoading: boolean
  isUploading: boolean
  isDeleting: boolean
  isRenaming: boolean
  isCreatingFolder: boolean
  error: string | null
  loadDirectory: (path: string) => Promise<void>
  uploadFileToPath: (file: File, targetPath: string) => Promise<void>
  downloadFileByPath: (path: string) => Promise<void>
  deleteItem: (path: string) => Promise<void>
  renameItem: (oldPath: string, newPath: string) => Promise<void>
  createFolder: (path: string) => Promise<void>
  navigateTo: (path: string) => Promise<void>
  navigateUp: () => Promise<void>
  refresh: () => Promise<void>
}

export const useAgentV2Files = (
  initialPath: string = ''
): UseAgentV2FilesResult => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath)
  const [items, setItems] = useState<AgentV2FileItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadDirectory = useCallback(async (path: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const listing: AgentV2DirectoryListing = await listDirectory(path)
      // Sort items: directories first, then files, both alphabetically
      const sortedItems = [...listing.items].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      setItems(sortedItems)
      setCurrentPath(path)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Failed to load directory'
      setError(errorMessage)
      console.error('Failed to load directory:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const uploadFileToPath = useCallback(
    async (file: File, targetPath: string) => {
      try {
        setIsUploading(true)
        setError(null)
        await uploadFile(file, targetPath)
        // Refresh current directory after upload
        await loadDirectory(currentPath)
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail || err.message || 'Failed to upload file'
        setError(errorMessage)
        console.error('Failed to upload file:', err)
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    [currentPath, loadDirectory]
  )

  const downloadFileByPath = useCallback(async (path: string) => {
    try {
      setError(null)
      await downloadFile(path)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Failed to download file'
      setError(errorMessage)
      console.error('Failed to download file:', err)
      throw err
    }
  }, [])

  const deleteItem = useCallback(
    async (path: string) => {
      try {
        setIsDeleting(true)
        setError(null)
        await deleteFile(path)
        // Refresh current directory after deletion
        await loadDirectory(currentPath)
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail || err.message || 'Failed to delete item'
        setError(errorMessage)
        console.error('Failed to delete item:', err)
        throw err
      } finally {
        setIsDeleting(false)
      }
    },
    [currentPath, loadDirectory]
  )

  const renameItem = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        setIsRenaming(true)
        setError(null)
        await renameFile(oldPath, newPath)
        // Refresh current directory after rename
        await loadDirectory(currentPath)
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail || err.message || 'Failed to rename item'
        setError(errorMessage)
        console.error('Failed to rename item:', err)
        throw err
      } finally {
        setIsRenaming(false)
      }
    },
    [currentPath, loadDirectory]
  )

  const createFolder = useCallback(
    async (path: string) => {
      try {
        setIsCreatingFolder(true)
        setError(null)
        // Construct full path if currentPath is not empty
        const fullPath = currentPath ? `${currentPath}/${path}` : path
        await createDirectory(fullPath)
        // Refresh current directory after creation
        await loadDirectory(currentPath)
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail ||
          err.message ||
          'Failed to create folder'
        setError(errorMessage)
        console.error('Failed to create folder:', err)
        throw err
      } finally {
        setIsCreatingFolder(false)
      }
    },
    [currentPath, loadDirectory]
  )

  const navigateTo = useCallback(
    async (path: string) => {
      await loadDirectory(path)
    },
    [loadDirectory]
  )

  const navigateUp = useCallback(async () => {
    if (!currentPath) {
      // Already at root
      return
    }
    // Get parent directory
    const pathParts = currentPath.split('/').filter(Boolean)
    pathParts.pop()
    const parentPath = pathParts.join('/')
    await loadDirectory(parentPath)
  }, [currentPath, loadDirectory])

  const refresh = useCallback(async () => {
    await loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  return {
    currentPath,
    items,
    isLoading,
    isUploading,
    isDeleting,
    isRenaming,
    isCreatingFolder,
    error,
    loadDirectory,
    uploadFileToPath,
    downloadFileByPath,
    deleteItem,
    renameItem,
    createFolder,
    navigateTo,
    navigateUp,
    refresh,
  }
}



