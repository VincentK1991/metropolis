/**
 * Workspace detail page showing threads and skills.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { getWorkspace, listWorkspaceThreads, updateWorkspace, deleteWorkspaceThread } from '../api/workspaceService'
import { skillService } from '../api/skillService'
import type { Workspace, WorkspaceThread } from '../types/workspace'
import type { Skill } from '../types/skill'

interface WorkspacePageProps {
  workspaceId: string
}

export const WorkspacePage = ({ workspaceId }: WorkspacePageProps) => {
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [threads, setThreads] = useState<WorkspaceThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null)
  const [threadToDelete, setThreadToDelete] = useState<WorkspaceThread | null>(null)

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        setLoading(true)
        const data = await getWorkspace(workspaceId)
        setWorkspace(data)

        const threadsData = await listWorkspaceThreads(workspaceId, 20, 0)
        setThreads(threadsData)

        setError(null)
      } catch (err: any) {
        setError(err.message || 'Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [workspaceId])

  const handleStartNewThread = () => {
    // Navigate to new thread with pending ID
    navigate({
      to: '/workspace/$workspaceId/$threadId',
      params: { workspaceId, threadId: 'pending' },
    })
  }

  const handleManageSkills = async () => {
    try {
      // Load all available skills
      const response = await skillService.listSkills(100, 0)
      setAvailableSkills(response.data.skills || [])

      // Set currently selected skills
      setSelectedSkillIds(workspace?.skill_ids || [])

      setShowSkillModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to load skills')
    }
  }

  const handleSaveSkills = async () => {
    try {
      setSaving(true)
      await updateWorkspace(workspaceId, { skill_ids: selectedSkillIds })

      // Reload workspace to get updated data
      const data = await getWorkspace(workspaceId)
      setWorkspace(data)

      setShowSkillModal(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update workspace skills')
    } finally {
      setSaving(false)
    }
  }

  const toggleSkillSelection = (skillId: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    )
  }

  const handleDeleteThread = async (thread: WorkspaceThread) => {
    setThreadToDelete(thread)
  }

  const confirmDeleteThread = async () => {
    if (!threadToDelete) return

    try {
      setDeletingThreadId(threadToDelete.claude_session_id)
      await deleteWorkspaceThread(workspaceId, threadToDelete.claude_session_id)

      // Reload threads
      const threadsData = await listWorkspaceThreads(workspaceId, 20, 0)
      setThreads(threadsData)

      setThreadToDelete(null)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete thread')
    } finally {
      setDeletingThreadId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nouveau-cream via-nouveau-lavender-100 to-nouveau-rose-100 dark:from-deco-navy-600 dark:via-deco-navy-500 dark:to-deco-burgundy-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nouveau-rose-400 dark:border-deco-gold"></div>
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nouveau-cream via-nouveau-lavender-100 to-nouveau-rose-100 dark:from-deco-navy-600 dark:via-deco-navy-500 dark:to-deco-burgundy-600 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300">
            {error || 'Workspace not found'}
          </div>
          <Link
            to="/workspace"
            className="mt-4 inline-block text-nouveau-rose-600 dark:text-deco-gold hover:underline"
          >
            ← Back to workspaces
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nouveau-cream via-nouveau-lavender-100 to-nouveau-rose-100 dark:from-deco-navy-600 dark:via-deco-navy-500 dark:to-deco-burgundy-600 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/workspace"
            className="inline-flex items-center text-nouveau-rose-600 dark:text-deco-gold hover:underline mb-4"
          >
            ← Back to workspaces
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-nouveau-cream mb-2">
                {workspace.name}
              </h1>
              {workspace.description && (
                <p className="text-gray-600 dark:text-gray-400">
                  {workspace.description}
                </p>
              )}
            </div>
            <button
              onClick={handleStartNewThread}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-nouveau-rose-400 to-nouveau-lavender-400 dark:from-deco-gold to-deco-emerald text-white font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              + New Thread
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Threads Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream mb-4">
              Threads
            </h2>
            {threads.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/60 dark:bg-deco-navy-500/60 rounded-xl p-8 border border-white/40 dark:border-deco-gold/20 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No threads yet. Start a conversation!
                </p>
                <button
                  onClick={handleStartNewThread}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-nouveau-rose-400 to-nouveau-lavender-400 dark:from-deco-gold to-deco-emerald text-white font-semibold hover:shadow-lg transition-all"
                >
                  Start New Thread
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {threads.map((thread) => (
                  <div
                    key={thread.claude_session_id}
                    className="backdrop-blur-xl bg-white/60 dark:bg-deco-navy-500/60 rounded-xl p-6 border border-white/40 dark:border-deco-gold/20 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        to="/workspace/$workspaceId/$threadId"
                        params={{ workspaceId, threadId: thread.claude_session_id }}
                        className="flex-1 group-hover:scale-[1.01] transition-transform"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-nouveau-cream mb-1 group-hover:text-nouveau-rose-600 dark:group-hover:text-deco-gold transition-colors">
                              {thread.metadata?.title || 'Untitled Thread'}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 text-xs rounded-full bg-nouveau-lavender-100 dark:bg-deco-emerald/20 text-nouveau-lavender-800 dark:text-deco-emerald-200">
                                {thread.message_count} {thread.message_count === 1 ? 'message' : 'messages'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Created {new Date(thread.created_at).toLocaleDateString()} at{' '}
                              {new Date(thread.created_at).toLocaleTimeString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Updated {new Date(thread.updated_at).toLocaleDateString()} at{' '}
                              {new Date(thread.updated_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleDeleteThread(thread)
                        }}
                        disabled={deletingThreadId === thread.claude_session_id}
                        className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 text-sm font-medium"
                        title="Delete thread"
                      >
                        {deletingThreadId === thread.claude_session_id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream">
                Skills
              </h2>
              <button
                onClick={handleManageSkills}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-nouveau-sage-400 to-nouveau-mint-400 dark:from-deco-emerald to-deco-gold text-white text-sm font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Manage Skills
              </button>
            </div>
            <div className="backdrop-blur-xl bg-white/60 dark:bg-deco-navy-500/60 rounded-xl p-6 border border-white/40 dark:border-deco-gold/20">
              {workspace.skills && workspace.skills.length > 0 ? (
                <div className="space-y-2">
                  {workspace.skills.map((skill) => (
                    <div
                      key={skill._id}
                      className="px-3 py-2 rounded-lg bg-nouveau-sage-100/70 dark:bg-deco-navy-400/70 text-nouveau-sage-800 dark:text-nouveau-cream"
                    >
                      {skill.title}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    No skills configured yet.
                  </p>
                  <button
                    onClick={handleManageSkills}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-nouveau-sage-400 to-nouveau-mint-400 dark:from-deco-emerald to-deco-gold text-white text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    Add Skills
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manage Skills Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-deco-navy-500 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream mb-4">
              Manage Workspace Skills
            </h2>

            <div className="flex-1 overflow-y-auto mb-6">
              {availableSkills.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No skills available. Create some skills first!
                  </p>
                  <Link
                    to="/skills"
                    className="mt-4 inline-block text-nouveau-rose-600 dark:text-deco-gold hover:underline"
                  >
                    Go to Skills Page →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableSkills.map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill._id)
                    return (
                      <label
                        key={skill._id}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-nouveau-sage-400 dark:border-deco-emerald bg-nouveau-sage-50 dark:bg-deco-emerald/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-nouveau-sage-300 dark:hover:border-deco-emerald/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkillSelection(skill._id)}
                          className="w-5 h-5 rounded border-gray-300 text-nouveau-sage-600 focus:ring-nouveau-sage-500 dark:border-gray-600 dark:bg-deco-navy-600"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-nouveau-cream">
                            {skill.title}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            {skill.content.substring(0, 100)}...
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedSkillIds.length} skill{selectedSkillIds.length !== 1 ? 's' : ''} selected
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSkillModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-deco-navy-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSkills}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-nouveau-sage-400 to-nouveau-mint-400 dark:from-deco-emerald to-deco-gold text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Skills'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Thread Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-deco-navy-500 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream mb-4">
              Delete Thread?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this thread? This will permanently delete all messages in this conversation.
            </p>
            <div className="bg-gray-100 dark:bg-deco-navy-600 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-nouveau-cream">
                {threadToDelete.metadata?.title || 'Untitled Thread'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {threadToDelete.message_count} messages
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setThreadToDelete(null)}
                disabled={deletingThreadId !== null}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-deco-navy-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteThread}
                disabled={deletingThreadId !== null}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 dark:bg-red-700 text-white font-semibold hover:bg-red-700 dark:hover:bg-red-800 transition-all disabled:opacity-50"
              >
                {deletingThreadId ? 'Deleting...' : 'Delete Thread'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

