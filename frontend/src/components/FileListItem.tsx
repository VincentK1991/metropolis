import React, { useState } from 'react'
import { FileIcon } from './common/FileIcon'
import type { FileMetadata } from '../api/fileService'

interface FileListItemProps {
  file: FileMetadata
  onDownload: (filename: string) => Promise<void>
  onDelete: (filename: string) => Promise<void>
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const FileListItem: React.FC<FileListItemProps> = ({
  file,
  onDownload,
  onDelete,
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onDownload(file.filename)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(file.filename)
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error('Delete failed:', err)
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-nouveau-lavender-100 dark:hover:bg-deco-navy-500 rounded-lg transition-colors group">
      <div className="flex items-center flex-1 min-w-0 mr-3">
        <div className="flex-shrink-0 text-gray-600 dark:text-gray-400 mr-3">
          <FileIcon fileType={file.file_type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-nouveau-cream truncate">
            {file.filename}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {formatFileSize(file.file_size)}
            {file.uploaded_at && ` • ${formatDate(file.uploaded_at)}`}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="p-1.5 rounded hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-400 transition-colors disabled:opacity-50"
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

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            title="Delete file"
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
              Delete
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
      </div>
    </div>
  )
}

