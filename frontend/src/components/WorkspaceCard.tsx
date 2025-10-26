/**
 * Workspace card component for displaying workspace summary.
 */

import { Link } from '@tanstack/react-router'
import type { Workspace } from '../types/workspace'

interface WorkspaceCardProps {
  workspace: Workspace
}

export const WorkspaceCard = ({ workspace }: WorkspaceCardProps) => {
  return (
    <Link
      to="/workspace/$workspaceId"
      params={{ workspaceId: workspace._id }}
      className="block group"
    >
      <div className="backdrop-blur-xl bg-white/60 dark:bg-deco-navy-500/60 rounded-xl p-6 border border-white/40 dark:border-deco-gold/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/70 dark:hover:bg-deco-navy-500/70">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-nouveau-cream group-hover:text-nouveau-rose-600 dark:group-hover:text-deco-gold transition-colors">
            {workspace.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-nouveau-lavender-200/60 dark:bg-deco-emerald/30 text-nouveau-lavender-800 dark:text-deco-emerald-200">
              {workspace.skill_ids.length} {workspace.skill_ids.length === 1 ? 'skill' : 'skills'}
            </span>
          </div>
        </div>

        {/* Description */}
        {workspace.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {workspace.description}
          </p>
        )}

        {/* Skills */}
        {workspace.skills && workspace.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {workspace.skills.slice(0, 3).map((skill) => (
              <span
                key={skill._id}
                className="px-2 py-1 text-xs rounded-md bg-nouveau-sage-100/70 dark:bg-deco-navy-400/70 text-nouveau-sage-800 dark:text-nouveau-cream"
              >
                {skill.title}
              </span>
            ))}
            {workspace.skills.length > 3 && (
              <span className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                +{workspace.skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  )
}

