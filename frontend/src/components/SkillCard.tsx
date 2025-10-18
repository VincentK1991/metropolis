import { useState } from 'react'
import type { Skill } from '../types/skill'
import { useDeleteSkill } from '../hooks/useSkills'

interface SkillCardProps {
  skill: Skill
  onView: (skill: Skill) => void
  onEdit: (skill: Skill) => void
}

export const SkillCard = ({ skill, onView, onEdit }: SkillCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteSkill = useDeleteSkill()

  const handleDelete = () => {
    deleteSkill.mutate(skill._id, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
      }
    })
  }

  const truncateContent = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className="glass-message-assistant rounded-2xl dark:rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300">
      {/* Content Preview - Clickable */}
      <div
        className="p-4 min-h-[120px]"
        onClick={() => onView(skill)}
      >
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words line-clamp-6">
          {truncateContent(skill.content, 200)}
        </div>
      </div>

      {/* Title and Actions */}
      <div className="px-4 py-3 bg-white/50 dark:bg-deco-navy/50 border-t border-gray-200/50 dark:border-deco-gold/20">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-nouveau-cream truncate flex-1 mr-2">
            {skill.title}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(skill)
              }}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {new Date(skill.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300 mb-2">Delete this skill?</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={deleteSkill.isPending}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteSkill.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(false)
              }}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

