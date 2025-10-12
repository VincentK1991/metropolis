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
    <div className="w-64 h-full backdrop-blur-xl bg-amber/60 dark:bg-deco-navy-500/60 backdrop-saturate-150 border-r border-white/30 dark:border-deco-gold/25 flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-white/30 dark:border-deco-gold/20">
        <button
          className="w-full px-4 py-3 backdrop-blur-md bg-gradient-to-br from-nouveau-lavender-300/70 to-nouveau-rose-300/70 dark:from-deco-emerald/80 dark:to-deco-gold/80 text-gray-900 dark:text-white border border-white/60 dark:border-deco-gold/40 rounded-2xl dark:rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-lg"
          onClick={onNewSession}
          disabled={isLoading}
        >
          + New Session
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 nouveau-scrollbar deco-scrollbar">
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
              className={`p-3 mx-1 mb-1 rounded-xl dark:rounded-lg cursor-pointer transition-all duration-200 ${
                session.claude_session_id === sessionId
                  ? 'backdrop-blur-md bg-gradient-to-br from-nouveau-lavender-300/85 to-nouveau-rose-300/85 dark:from-deco-burgundy/90 dark:to-deco-emerald/90 border border-white/70 dark:border-deco-gold/50 text-gray-900 dark:text-white shadow-lg'
                  : 'backdrop-blur-sm bg-amber/40 dark:bg-deco-navy-400/40 border border-white/30 dark:border-deco-silver/20 text-gray-800 dark:text-gray-200 hover:bg-amber/60 dark:hover:bg-deco-navy-300/60 hover:border-white/50 dark:hover:border-deco-gold/30 shadow-md'
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

