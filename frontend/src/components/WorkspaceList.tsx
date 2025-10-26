/**
 * Workspace list component with pagination.
 */

import { useState, useEffect } from 'react'
import { WorkspaceCard } from './WorkspaceCard'
import { listWorkspaces, createWorkspace } from '../api/workspaceService'
import type { Workspace, CreateWorkspaceRequest } from '../types/workspace'

export const WorkspaceList = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      const data = await listWorkspaces(20, 0)
      setWorkspaces(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const handleCreateWorkspace = async (request: CreateWorkspaceRequest) => {
    try {
      await createWorkspace(request)
      setShowCreateModal(false)
      loadWorkspaces()
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nouveau-cream via-nouveau-lavender-100 to-nouveau-rose-100 dark:from-deco-navy-600 dark:via-deco-navy-500 dark:to-deco-burgundy-600 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-nouveau-cream mb-2">
                Workspaces
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Create and manage your AI workspaces with custom skills
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-nouveau-rose-400 to-nouveau-lavender-400 dark:from-deco-gold to-deco-emerald text-white font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              + New Workspace
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nouveau-rose-400 dark:border-deco-gold"></div>
          </div>
        )}

        {/* Workspace Grid */}
        {!loading && workspaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace._id} workspace={workspace} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && workspaces.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              No workspaces yet. Create your first workspace to get started!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-nouveau-rose-400 to-nouveau-lavender-400 dark:from-deco-gold to-deco-emerald text-white font-semibold hover:shadow-lg transition-all duration-300"
            >
              Create Workspace
            </button>
          </div>
        )}
      </div>

      {/* Create Modal - Simple version */}
      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWorkspace}
        />
      )}
    </div>
  )
}

// Simple create modal component
interface CreateWorkspaceModalProps {
  onClose: () => void
  onCreate: (request: CreateWorkspaceRequest) => void
}

const CreateWorkspaceModal = ({ onClose, onCreate }: CreateWorkspaceModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate({ name: name.trim(), description: description.trim(), skill_ids: [] })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-deco-navy-500 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream mb-4">
          Create New Workspace
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-deco-navy-600 text-gray-900 dark:text-nouveau-cream focus:outline-none focus:ring-2 focus:ring-nouveau-rose-400 dark:focus:ring-deco-gold"
              placeholder="My Workspace"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-deco-navy-600 text-gray-900 dark:text-nouveau-cream focus:outline-none focus:ring-2 focus:ring-nouveau-rose-400 dark:focus:ring-deco-gold"
              placeholder="Describe your workspace..."
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-deco-navy-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-nouveau-rose-400 to-nouveau-lavender-400 dark:from-deco-gold to-deco-emerald text-white font-semibold hover:shadow-lg transition-all"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

