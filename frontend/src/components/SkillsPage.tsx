import { useState } from 'react'
import { useSkills } from '../hooks/useSkills'
import { SkillCard } from './SkillCard'
import { SkillViewModal } from './SkillViewModal'
import { SkillEditorModal } from './SkillEditorModal'
import type { Skill } from '../types/skill'

export const SkillsPage = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data, isLoading, error } = useSkills(currentPage)
  const skills = data?.skills || []

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    if (skills.length === 12) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handleView = (skill: Skill) => {
    setViewingSkill(skill)
  }

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill)
    setViewingSkill(null)
  }

  const handleDelete = () => {
    // Handled in SkillCard component
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-nouveau-cream">
              Skills
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage AI agent skills and capabilities
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-nouveau-lavender-500 dark:bg-deco-gold text-white dark:text-deco-navy rounded-lg hover:bg-nouveau-lavender-600 dark:hover:bg-deco-gold/90 transition-colors font-medium"
          >
            + Create New Skill
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-nouveau-lavender-500 dark:border-deco-gold border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading skills...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">Failed to load skills</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && skills.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No skills yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-nouveau-lavender-500 dark:bg-deco-gold text-white dark:text-deco-navy rounded-lg hover:bg-nouveau-lavender-600 dark:hover:bg-deco-gold/90 transition-colors"
            >
              Create your first skill
            </button>
          </div>
        )}

        {/* Masonry Grid */}
        {!isLoading && !error && skills.length > 0 && (
          <div
            className="masonry-grid"
            style={{
              columnCount: 3,
              columnGap: '1.5rem',
            }}
          >
            {skills.map((skill) => (
              <div key={skill._id} style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
                <SkillCard
                  skill={skill}
                  onView={handleView}
                  onEdit={handleEdit}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && skills.length > 0 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-700 dark:text-gray-300">
              Page {currentPage + 1}
            </span>
            <button
              onClick={handleNextPage}
              disabled={skills.length < 12}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingSkill && (
        <SkillViewModal
          skill={viewingSkill}
          onClose={() => setViewingSkill(null)}
          onEdit={handleEdit}
        />
      )}

      {editingSkill && (
        <SkillEditorModal
          skill={editingSkill}
          onClose={() => setEditingSkill(null)}
        />
      )}

      {isCreating && (
        <SkillEditorModal
          onClose={() => setIsCreating(false)}
        />
      )}
    </div>
  )
}

