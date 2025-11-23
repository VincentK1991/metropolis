import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface AgentV2CreateFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (folderName: string) => Promise<void>
  existingNames: string[]
}

export const AgentV2CreateFolderDialog: React.FC<
  AgentV2CreateFolderDialogProps
> = ({ isOpen, onClose, onCreate, existingNames }) => {
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setFolderName('')
      setError(null)
    }
  }, [isOpen])

  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Folder name cannot be empty'
    }

    // Check for invalid characters
    if (name.includes('/') || name.includes('\\')) {
      return 'Folder name cannot contain / or \\'
    }

    // Check for duplicate names (case-insensitive)
    if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      return 'A folder with this name already exists'
    }

    return null
  }

  const handleCreate = async () => {
    const validationError = validateFolderName(folderName)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      await onCreate(folderName.trim())
      setFolderName('')
      onClose()
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Failed to create folder'
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreate()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Create New Folder
        </h3>

        <div className="mb-4">
          <label
            htmlFor="folder-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Folder Name
          </label>
          <input
            ref={inputRef}
            id="folder-name"
            type="text"
            value={folderName}
            onChange={(e) => {
              setFolderName(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="Enter folder name"
            disabled={isCreating}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !folderName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}



