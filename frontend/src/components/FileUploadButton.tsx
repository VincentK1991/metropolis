import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface FileUploadButtonProps {
  workspaceId: string
  threadId: string
  onUploadComplete?: () => void
  onUpload?: (file: File) => Promise<void>
  disabled?: boolean
}

const ALLOWED_EXTENSIONS = ['pptx', 'csv', 'pdf', 'txt', 'md', 'xlsx', 'html']
const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16 MB

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  // workspaceId is kept for future use
  threadId,
  onUploadComplete,
  onUpload,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buttonPosition, setButtonPosition] = useState({ bottom: 0, left: 0 })

  // Calculate button position when error appears
  useEffect(() => {
    if (error && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      })
    }
  }, [error])

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large (max 16 MB)'
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    }

    return null
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setTimeout(() => setError(null), 5000)
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      if (onUpload) {
        await onUpload(file)
      }
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const isPending = threadId === 'pending'

  const renderError = () => {
    if (!error) return null

    return createPortal(
      <div
        className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg whitespace-nowrap"
        style={{
          position: 'fixed',
          bottom: `${buttonPosition.bottom}px`,
          left: `${buttonPosition.left}px`,
          zIndex: 99998,
        }}
      >
        {error}
      </div>,
      document.body
    )
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
        onChange={handleFileChange}
        disabled={disabled || isUploading || isPending}
      />
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled || isUploading || isPending}
        className="p-2 rounded-lg hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-nouveau-lavender-400 dark:focus:ring-deco-gold"
        title={isPending ? 'Start a conversation first' : 'Upload file'}
      >
        {isUploading ? (
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin"
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
            className="w-5 h-5 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        )}
      </button>

      {/* Render error via portal */}
      {renderError()}
    </>
  )
}

