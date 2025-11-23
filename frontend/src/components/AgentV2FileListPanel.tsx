import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAgentV2Files } from '../hooks/useAgentV2Files'
import { AgentV2FileListItem } from './AgentV2FileListItem'
import { AgentV2FolderBreadcrumb } from './AgentV2FolderBreadcrumb'
import { AgentV2CreateFolderDialog } from './AgentV2CreateFolderDialog'

interface AgentV2FileListPanelProps {
  onUploadComplete?: () => void
}

export const AgentV2FileListPanel: React.FC<AgentV2FileListPanelProps> = ({
  onUploadComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 })

  const {
    currentPath,
    items,
    isLoading,
    error,
    loadDirectory,
    downloadFileByPath,
    deleteItem,
    renameItem,
    createFolder,
    navigateTo,
    navigateUp,
    refresh,
  } = useAgentV2Files()

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

  // Load directory when panel opens
  useEffect(() => {
    if (isOpen) {
      loadDirectory(currentPath)
    }
  }, [isOpen, currentPath, loadDirectory])

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
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

  const handleDownload = async (path: string) => {
    try {
      await downloadFileByPath(path)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleDelete = async (path: string) => {
    try {
      await deleteItem(path)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleRename = async (oldPath: string, newPath: string) => {
    try {
      await renameItem(oldPath, newPath)
    } catch (err) {
      console.error('Rename failed:', err)
    }
  }

  const handleCreateFolder = async (folderName: string) => {
    try {
      await createFolder(folderName)
      setShowCreateFolderDialog(false)
    } catch (err) {
      console.error('Create folder failed:', err)
      throw err
    }
  }

  const handleNavigate = async (path: string) => {
    await navigateTo(path)
  }

  const handleNavigateUp = async () => {
    await navigateUp()
  }

  const handleRefresh = async () => {
    await refresh()
    if (onUploadComplete) {
      onUploadComplete()
    }
  }

  // Get existing folder names for validation
  const existingFolderNames = items
    .filter((item) => item.type === 'directory')
    .map((item) => item.name)

  const renderPanel = () => {
    if (!isOpen) return null

    return createPortal(
      <div
        ref={panelRef}
        className="w-96 max-h-[600px] overflow-hidden rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col z-[99999]"
        style={{
          position: 'fixed',
          top: `${buttonPosition.top}px`,
          right: `${buttonPosition.right}px`,
          zIndex: 99999,
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Files in Workspace
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateFolderDialog(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Create folder"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Refresh file list"
            >
              <svg
                className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${
                  isLoading ? 'animate-spin' : ''
                }`}
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
        </div>

        {/* Breadcrumb Navigation */}
        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <AgentV2FolderBreadcrumb
            currentPath={currentPath}
            onNavigate={handleNavigate}
            onNavigateUp={handleNavigateUp}
          />
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto py-2 glass-scrollbar">
          {isLoading && items.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
              Loading files...
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : items.length === 0 ? (
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
              <p className="text-sm">No files in this directory</p>
              <p className="text-xs mt-1">Upload files or create folders to get started</p>
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {items.map((item) => (
                <AgentV2FileListItem
                  key={item.path}
                  item={item}
                  onDownload={item.type === 'file' ? handleDownload : undefined}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onNavigate={
                    item.type === 'directory' ? handleNavigate : undefined
                  }
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
        className="glass-button p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        title="View files"
        aria-label="File list"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5 text-gray-700 dark:text-gray-300"
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
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 dark:bg-blue-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {items.length}
          </span>
        )}
      </button>

      {/* Render panel via portal */}
      {renderPanel()}

      {/* Create Folder Dialog */}
      <AgentV2CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        onCreate={handleCreateFolder}
        existingNames={existingFolderNames}
      />
    </>
  )
}



