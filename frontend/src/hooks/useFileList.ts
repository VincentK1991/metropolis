import { useState, useCallback } from 'react'
import * as fileService from '../api/fileService'
import type { FileMetadata } from '../api/fileService'

export const useFileList = (workspaceId: string, threadId: string) => {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refreshFiles = useCallback(async () => {
    if (!threadId || threadId === 'pending') return

    setIsLoading(true)
    setError(null)

    try {
      const fileList = await fileService.listFiles(workspaceId, threadId)
      setFiles(fileList)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to load files:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, threadId])

  const uploadFile = useCallback(
    async (file: File) => {
      if (!threadId || threadId === 'pending') {
        throw new Error('Cannot upload to pending thread')
      }

      setIsLoading(true)
      setError(null)

      try {
        await fileService.uploadFile(workspaceId, threadId, file)
        await refreshFiles()
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [workspaceId, threadId, refreshFiles]
  )

  const downloadFile = useCallback(
    async (filename: string) => {
      if (!threadId || threadId === 'pending') {
        throw new Error('Cannot download from pending thread')
      }

      try {
        await fileService.downloadFile(workspaceId, threadId, filename)
      } catch (err) {
        setError(err as Error)
        throw err
      }
    },
    [workspaceId, threadId]
  )

  const deleteFile = useCallback(
    async (filename: string) => {
      if (!threadId || threadId === 'pending') {
        throw new Error('Cannot delete from pending thread')
      }

      setIsLoading(true)
      setError(null)

      try {
        await fileService.deleteFile(workspaceId, threadId, filename)
        await refreshFiles()
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [workspaceId, threadId, refreshFiles]
  )

  return {
    files,
    isLoading,
    error,
    refreshFiles,
    uploadFile,
    downloadFile,
    deleteFile,
  }
}

