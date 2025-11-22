import React from 'react'

interface AgentV2FolderBreadcrumbProps {
  currentPath: string
  onNavigate: (path: string) => void
  onNavigateUp: () => void
}

export const AgentV2FolderBreadcrumb: React.FC<
  AgentV2FolderBreadcrumbProps
> = ({ currentPath, onNavigate, onNavigateUp }) => {
  // Split path into segments
  const pathSegments = currentPath
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => ({
      name: segment,
      path: array.slice(0, index + 1).join('/'),
    }))

  const handleSegmentClick = (path: string) => {
    onNavigate(path)
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 dark:text-gray-300">
      {/* Home/Root button */}
      <button
        onClick={() => onNavigate('')}
        className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
        title="Root directory"
      >
        /
      </button>

      {/* Path segments */}
      {pathSegments.length > 0 && (
        <>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          {pathSegments.map((segment, index) => (
            <React.Fragment key={segment.path}>
              <button
                onClick={() => handleSegmentClick(segment.path)}
                className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors truncate max-w-[120px]"
                title={segment.name}
              >
                {segment.name}
              </button>
              {index < pathSegments.length - 1 && (
                <span className="text-gray-400 dark:text-gray-500">/</span>
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {/* Up button (only show if not at root) */}
      {currentPath && (
        <>
          <span className="text-gray-400 dark:text-gray-500 mx-1">|</span>
          <button
            onClick={onNavigateUp}
            className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Go to parent directory"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            Up
          </button>
        </>
      )}
    </div>
  )
}

