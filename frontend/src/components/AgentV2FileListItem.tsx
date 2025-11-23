import React, { useState } from 'react'
import { FileIcon } from './common/FileIcon'
import type { AgentV2FileItem } from '../types/agentV2Files'

interface AgentV2FileListItemProps {
  item: AgentV2FileItem
  onDownload?: (path: string) => Promise<void>
  onDelete: (path: string) => Promise<void>
  onRename: (oldPath: string, newPath: string) => Promise<void>
  onNavigate?: (path: string) => void
}

const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000) // Convert Unix timestamp to milliseconds
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const AgentV2FileListItem: React.FC<AgentV2FileListItemProps> = ({
  item,
  onDownload,
  onDelete,
  onRename,
  onNavigate,
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [isEditing, setIsEditing] = useState(false)

  const handleDownload = async () => {
    if (!onDownload) return
    setIsDownloading(true)
    try {
      await onDownload(item.path)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(item.path)
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error('Delete failed:', err)
      setIsDeleting(false)
    }
  }

  const handleStartRename = () => {
    setIsEditing(true)
    setEditName(item.name)
  }

  const handleCancelRename = () => {
    setIsEditing(false)
    setEditName(item.name)
  }

  const handleSaveRename = async () => {
    if (!editName.trim() || editName === item.name) {
      setIsEditing(false)
      return
    }

    // Validate: no special characters that could cause path issues
    if (editName.includes('/') || editName.includes('\\')) {
      alert('Folder name cannot contain / or \\')
      return
    }

    setIsRenaming(true)
    try {
      // Construct new path
      const pathParts = item.path.split('/')
      pathParts[pathParts.length - 1] = editName.trim()
      const newPath = pathParts.join('/')
      await onRename(item.path, newPath)
      setIsEditing(false)
    } catch (err) {
      console.error('Rename failed:', err)
    } finally {
      setIsRenaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  const handleItemClick = () => {
    if (item.type === 'directory' && onNavigate) {
      onNavigate(item.path)
    }
  }

  const getFileType = (): string => {
    if (item.type === 'directory') {
      return 'directory'
    }
    const extension = item.name.split('.').pop()?.toLowerCase() || ''
    return extension
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group">
      <div
        className="flex items-center flex-1 min-w-0 mr-3 cursor-pointer"
        onClick={handleItemClick}
      >
        <div className="flex-shrink-0 text-gray-600 dark:text-gray-400 mr-3">
          <FileIcon fileType={getFileType()} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveRename}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-sm font-medium rounded border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isRenaming}
            />
          ) : (
            <>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.name}
                {item.type === 'directory' && (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">/</span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {item.type === 'file' && formatFileSize(item.size)}
                {item.type === 'file' && item.size !== null && ' • '}
                {formatDate(item.modified)}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
        {item.type === 'file' && onDownload && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Download file"
          >
            {isDownloading ? (
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-300 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
          </button>
        )}

        {!isEditing && (
          <>
            <button
              onClick={handleStartRename}
              disabled={isDeleting || isRenaming}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              title="Rename"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isRenaming}
                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <svg
                  className="w-4 h-4 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            ) : (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}



