import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useFileList } from '../hooks/useFileList'
import { FileListItem } from './FileListItem'

interface FileListPanelProps {
  workspaceId: string
  threadId: string
}

export const FileListPanel: React.FC<FileListPanelProps> = ({
  workspaceId,
  threadId,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 })

  const { files, isLoading, error, refreshFiles, downloadFile, deleteFile } =
    useFileList(workspaceId, threadId)

  // Calculate button position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  // Load files when panel opens
  useEffect(() => {
    if (isOpen && threadId && threadId !== 'pending') {
      refreshFiles()
    }
  }, [isOpen, threadId, refreshFiles])

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDownload = async (filename: string) => {
    try {
      await downloadFile(filename)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      await deleteFile(filename)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const isPending = threadId === 'pending'

  const renderPanel = () => {
    if (!isOpen) return null

    return createPortal(
      <div
        ref={panelRef}
        className="w-96 max-h-96 overflow-y-auto rounded-lg shadow-xl bg-white dark:bg-deco-navy-600 border border-gray-200 dark:border-gray-700"
        style={{
          position: 'fixed',
          top: `${buttonPosition.top}px`,
          right: `${buttonPosition.right}px`,
          zIndex: 99998,
        }}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-nouveau-cream">
            Files in Execution Environment
          </h3>
          <button
            onClick={refreshFiles}
            disabled={isLoading}
            className="p-1 rounded hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-400 transition-colors disabled:opacity-50"
            title="Refresh file list"
          >
            <svg
              className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="py-2">
          {isLoading && files.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
              Loading files...
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center text-red-600 dark:text-red-400">
              {error.message}
            </div>
          ) : files.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">No files in this thread</p>
              <p className="text-xs mt-1">Upload files to share with the agent</p>
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {files.map((file) => (
                <FileListItem
                  key={file.filename}
                  file={file}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  return (
    <>
      {/* Files Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="p-2 rounded-lg hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-nouveau-lavender-400 dark:focus:ring-deco-gold"
        title={isPending ? 'Start a conversation first' : 'View files'}
        aria-label="File list"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        {files.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-nouveau-lavender-400 dark:bg-deco-gold text-white dark:text-deco-navy-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {files.length}
          </span>
        )}
      </button>

      {/* Render panel via portal */}
      {renderPanel()}
    </>
  )
}

