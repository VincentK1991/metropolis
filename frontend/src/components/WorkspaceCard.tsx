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
      <div className="glass-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {workspace.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full glass-light dark:glass-dark text-gray-700 dark:text-gray-200">
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
                className="px-2 py-1 text-xs rounded-md glass-light dark:glass-dark text-gray-700 dark:text-gray-200"
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
        <div className="mt-4 pt-4 border-t border-white/20 dark:border-white/10">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  )
}

