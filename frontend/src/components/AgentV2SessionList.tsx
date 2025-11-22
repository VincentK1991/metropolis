import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { AgentV2Session } from '../types/agentV2'

interface AgentV2SessionListProps {
  sessionId: string | null
  availableSessions: AgentV2Session[]
  onNewSession: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => Promise<void>
  onRenameSession: (sessionId: string, newTitle: string) => Promise<void>
  isLoading: boolean
  hasMoreSessions: boolean
  isLoadingMoreSessions: boolean
  onLoadMoreSessions: () => void
}

export const AgentV2SessionList: React.FC<AgentV2SessionListProps> = ({
  sessionId,
  availableSessions,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  isLoading,
  hasMoreSessions,
  isLoadingMoreSessions,
  onLoadMoreSessions,
}) => {
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const menuElement = document.getElementById('session-menu-dropdown')
      const clickedButton = Array.from(buttonRefs.current.values()).some(
        (btn) => btn && btn.contains(target)
      )

      if (menuElement && !menuElement.contains(target) && !clickedButton) {
        setOpenMenuId(null)
        setMenuPosition(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  // Infinite scroll for sessions
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer || !hasMoreSessions || isLoadingMoreSessions) {
      return
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      // Load more when within 100px of bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        onLoadMoreSessions()
      }
    }

    // Throttle scroll events
    let timeoutId: NodeJS.Timeout | null = null
    const throttledHandleScroll = () => {
      if (timeoutId) return
      timeoutId = setTimeout(() => {
        handleScroll()
        timeoutId = null
      }, 200)
    }

    scrollContainer.addEventListener('scroll', throttledHandleScroll)
    return () => {
      scrollContainer.removeEventListener('scroll', throttledHandleScroll)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [hasMoreSessions, isLoadingMoreSessions, onLoadMoreSessions])

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

  const handleDelete = async (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingSessionId(sessionIdToDelete)
    try {
      await onDeleteSession(sessionIdToDelete)
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete session:', err)
    } finally {
      setDeletingSessionId(null)
    }
  }

  const handleStartRename = (session: AgentV2Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenuId(null)
    setMenuPosition(null)
    setEditingSessionId(session.claude_session_id)
    setEditTitle(session.metadata?.title || 'Untitled Session')
  }

  const handleStartDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenuId(null)
    setMenuPosition(null)
    setShowDeleteConfirm(sessionId)
  }

  const handleToggleMenu = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (openMenuId === sessionId) {
      setOpenMenuId(null)
      setMenuPosition(null)
    } else {
      const button = buttonRefs.current.get(sessionId)
      if (button) {
        const rect = button.getBoundingClientRect()
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 120, // Align right edge of menu with right edge of button
        })
      }
      setOpenMenuId(sessionId)
    }
  }

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(null)
    setEditTitle('')
  }

  const handleSaveRename = async (sessionIdToRename: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editTitle.trim()) {
      return
    }
    setRenamingSessionId(sessionIdToRename)
    try {
      await onRenameSession(sessionIdToRename, editTitle.trim())
      setEditingSessionId(null)
      setEditTitle('')
    } catch (err) {
      console.error('Failed to rename session:', err)
    } finally {
      setRenamingSessionId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, sessionIdToRename: string) => {
    if (e.key === 'Enter') {
      const syntheticEvent = {
        stopPropagation: () => {},
      } as React.MouseEvent
      handleSaveRename(sessionIdToRename, syntheticEvent)
    } else if (e.key === 'Escape') {
      const syntheticEvent = {
        stopPropagation: () => {},
      } as React.MouseEvent
      handleCancelRename(syntheticEvent)
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-visible p-2 glass-scrollbar"
      >
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
              className={`p-3 mx-1 mb-1 rounded-xl transition-all duration-200 relative ${
                session.claude_session_id === sessionId
                  ? 'glass-card text-gray-900 dark:text-gray-100 shadow-lg'
                  : 'glass-light dark:glass-dark text-gray-800 dark:text-gray-200 hover:shadow-md'
              }`}
            >
              <div
                className="cursor-pointer"
                onClick={() => onSelectSession(session.claude_session_id)}
              >
                {editingSessionId === session.claude_session_id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, session.claude_session_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-sm font-medium mb-1 rounded border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <div className="text-sm font-medium mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {session.metadata?.title || 'Untitled Session'}
                  </div>
                )}
                <div
                  className={`text-xs font-mono mb-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                    session.claude_session_id === sessionId
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {session.claude_session_id.slice(0, 8)}...
                </div>
                <div
                  className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap ${
                    session.claude_session_id === sessionId
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {session.message_count} message
                  {session.message_count !== 1 ? 's' : ''} · {formatDate(session.created_at)}
                </div>
                {session.total_cost_usd !== undefined && session.total_cost_usd > 0 && (
                  <div
                    className={`text-xs font-mono mt-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                      session.claude_session_id === sessionId
                        ? 'text-gray-600 dark:text-gray-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    ${session.total_cost_usd.toFixed(4)} · {session.total_input_tokens || 0}in /{' '}
                    {session.total_output_tokens || 0}out
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-2 flex justify-end relative" ref={menuRef}>
                {editingSessionId === session.claude_session_id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleSaveRename(session.claude_session_id, e)}
                      disabled={renamingSessionId === session.claude_session_id || !editTitle.trim()}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      title="Save"
                    >
                      {renamingSessionId === session.claude_session_id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelRename}
                      disabled={renamingSessionId === session.claude_session_id}
                      className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                      title="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                ) : showDeleteConfirm === session.claude_session_id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(session.claude_session_id, e)}
                      disabled={deletingSessionId === session.claude_session_id}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingSessionId === session.claude_session_id ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteConfirm(null)
                      }}
                      disabled={deletingSessionId === session.claude_session_id}
                      className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      ref={(el) => {
                        if (el) {
                          buttonRefs.current.set(session.claude_session_id, el)
                        } else {
                          buttonRefs.current.delete(session.claude_session_id)
                        }
                      }}
                      onClick={(e) => handleToggleMenu(session.claude_session_id, e)}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="More options"
                    >
                      <svg
                        className="w-4 h-4 text-gray-600 dark:text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {openMenuId === session.claude_session_id &&
                      menuPosition &&
                      createPortal(
                        <div
                          id="session-menu-dropdown"
                          className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]"
                          style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                          }}
                        >
                          <button
                            onClick={(e) => handleStartRename(session, e)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleStartDelete(session.claude_session_id, e)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>,
                        document.body
                      )}
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {/* Load More Indicator */}
        {hasMoreSessions && (
          <div className="p-4 text-center">
            {isLoadingMoreSessions ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Loading more sessions...
              </div>
            ) : (
              <button
                onClick={onLoadMoreSessions}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Load More
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

