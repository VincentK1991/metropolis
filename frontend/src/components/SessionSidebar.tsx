import React from 'react'
import type { SessionInfo } from '../types/session'

interface SessionSidebarProps {
  sessionId: string | null
  availableSessions: SessionInfo[]
  onNewSession: () => void
  onSelectSession: (sessionId: string) => void
  isLoading: boolean
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessionId,
  availableSessions,
  onNewSession,
  onSelectSession,
  isLoading,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="w-64 h-full glass-chat-panel-light dark:glass-chat-panel-dark border-r border-white/20 dark:border-white/10 flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-white/20 dark:border-white/10">
        <button
          className="glass-button w-full px-4 py-3 rounded-xl text-gray-900 dark:text-gray-100 text-sm font-semibold cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          onClick={onNewSession}
          disabled={isLoading}
        >
          + New Session
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 glass-scrollbar">
        <h3 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mx-2 my-2 tracking-wider">
          Recent Sessions
        </h3>

        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            Loading sessions...
          </div>
        ) : availableSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No sessions yet
          </div>
        ) : (
          availableSessions.map((session) => (
            <div
              key={session.claude_session_id}
              className={`p-3 mx-1 mb-1 rounded-xl cursor-pointer transition-all duration-200 ${
                session.claude_session_id === sessionId
                  ? 'glass-card text-gray-900 dark:text-gray-100 shadow-lg'
                  : 'glass-light dark:glass-dark text-gray-800 dark:text-gray-200 hover:shadow-md'
              }`}
              onClick={() => onSelectSession(session.claude_session_id)}
            >
              <div className="text-sm font-medium mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {session.metadata.title || 'Untitled Session'}
              </div>
              <div className={`text-xs font-mono mb-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                session.claude_session_id === sessionId
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {session.claude_session_id}
              </div>
              <div className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap ${
                session.claude_session_id === sessionId
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {session.message_count} message{session.message_count !== 1 ? 's' : ''} ·{' '}
                {formatDate(session.updated_at)}
              </div>
              {session.total_cost_usd !== undefined && session.total_cost_usd > 0 && (
                <div className={`text-xs font-mono mt-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                  session.claude_session_id === sessionId
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  ${session.total_cost_usd.toFixed(4)} · {session.total_input_tokens || 0}in /{' '}
                  {session.total_output_tokens || 0}out
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

