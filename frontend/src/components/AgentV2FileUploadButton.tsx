import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAgentV2Files } from '../hooks/useAgentV2Files'

interface AgentV2FileUploadButtonProps {
  onUploadComplete?: () => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB (from backend MAX_UPLOAD_SIZE)

export const AgentV2FileUploadButton: React.FC<
  AgentV2FileUploadButtonProps
> = ({ onUploadComplete, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [buttonPosition, setButtonPosition] = useState({ bottom: 0, left: 0 })

  const { uploadFileToPath, currentPath, isUploading } = useAgentV2Files()

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
      return `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)} MB)`
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

    try {
      await uploadFileToPath(file, currentPath)
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (err: any) {
      const errorMessage =
        err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const renderError = () => {
    if (!error) return null

    return createPortal(
      <div
        className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-[99999]"
        style={{
          position: 'fixed',
          bottom: `${buttonPosition.bottom}px`,
          left: `${buttonPosition.left}px`,
          zIndex: 99999,
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
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="glass-button p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        title="Upload file"
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
            className="w-5 h-5 text-gray-700 dark:text-gray-300"
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



