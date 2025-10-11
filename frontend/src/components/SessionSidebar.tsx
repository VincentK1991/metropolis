import React from 'react'
import { SessionInfo } from '../types/session'
import './SessionSidebar.css'

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
    <div className="session-sidebar">
      <div className="session-sidebar-header">
        <button className="new-session-btn" onClick={onNewSession} disabled={isLoading}>
          + New Session
        </button>
      </div>

      <div className="session-list">
        <h3 className="session-list-title">Recent Sessions</h3>

        {isLoading ? (
          <div className="session-loading">Loading sessions...</div>
        ) : availableSessions.length === 0 ? (
          <div className="session-empty">No sessions yet</div>
        ) : (
          availableSessions.map((session) => (
            <div
              key={session.claude_session_id}
              className={`session-item ${
                session.claude_session_id === sessionId ? 'active' : ''
              }`}
              onClick={() => onSelectSession(session.claude_session_id)}
            >
              <div className="session-title">
                {session.metadata.title || 'Untitled Session'}
              </div>
              <div className="session-id">
                {session.claude_session_id}
              </div>
              <div className="session-info">
                {session.message_count} message{session.message_count !== 1 ? 's' : ''} ·{' '}
                {formatDate(session.updated_at)}
              </div>
              {session.total_cost_usd !== undefined && session.total_cost_usd > 0 && (
                <div className="session-cost">
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

