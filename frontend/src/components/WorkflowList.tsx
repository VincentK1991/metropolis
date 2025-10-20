/**
 * Component to display available workflows in a paginated list.
 */

import { useState } from 'react'
import { useWorkflows } from '../hooks/useWorkflows'
import type { Workflow } from '../types/workflow'

interface WorkflowListProps {
  selectedWorkflow: Workflow | null
  onSelectWorkflow: (workflow: Workflow) => void
}

export function WorkflowList({ selectedWorkflow, onSelectWorkflow }: WorkflowListProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  const { data: workflows = [], isLoading, error } = useWorkflows(currentPage, pageSize)

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nouveau-lavender-400 dark:border-deco-gold"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <p>Failed to load workflows</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workflows List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {workflows.length === 0 ? (
          <div className="text-center py-8 text-nouveau-lavender-600 dark:text-nouveau-cream/60">
            <p>No workflows available</p>
            <p className="text-sm mt-1">Create some skills first to use as workflows</p>
          </div>
        ) : (
          workflows.map((workflow) => (
            <WorkflowCard
              key={workflow._id}
              workflow={workflow}
              isSelected={selectedWorkflow?._id === workflow._id}
              onSelect={() => onSelectWorkflow(workflow)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {workflows.length === pageSize && (
        <div className="p-4 border-t border-nouveau-lavender-200 dark:border-deco-gold/20 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-sm rounded-md bg-nouveau-lavender-100 dark:bg-deco-navy-400 text-nouveau-lavender-800 dark:text-nouveau-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-300 transition-colors"
          >
            Previous
          </button>

          <span className="text-sm text-nouveau-lavender-600 dark:text-nouveau-cream/80">
            Page {currentPage + 1}
          </span>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={workflows.length < pageSize}
            className="px-3 py-1 text-sm rounded-md bg-nouveau-lavender-100 dark:bg-deco-navy-400 text-nouveau-lavender-800 dark:text-nouveau-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-300 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

interface WorkflowCardProps {
  workflow: Workflow
  isSelected: boolean
  onSelect: () => void
}

function WorkflowCard({ workflow, isSelected, onSelect }: WorkflowCardProps) {
  // Extract first few lines of content and remove markdown formatting for preview
  const getPreviewContent = (content: string) => {
    // Remove markdown headers and formatting for preview
    const cleanContent = content
      .replace(/^#+\s+/gm, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/`(.*?)`/g, '$1') // Remove inline code formatting
      .replace(/^\s*-\s+/gm, '• ') // Convert markdown bullets to bullet points
      .trim()

    return cleanContent.length > 150
      ? cleanContent.substring(0, 150) + '...'
      : cleanContent
  }

  const previewContent = getPreviewContent(workflow.content)

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-nouveau-lavender-400 dark:border-deco-gold bg-nouveau-lavender-50 dark:bg-deco-gold/10 shadow-md'
          : 'border-nouveau-lavender-200 dark:border-deco-gold/20 bg-white/40 dark:bg-deco-navy/20 hover:border-nouveau-lavender-300 dark:hover:border-deco-gold/40 hover:shadow-sm'
      }`}
    >
      {/* Workflow Title */}
      <h3 className="font-medium text-nouveau-lavender-800 dark:text-deco-gold mb-2 line-clamp-1">
        {workflow.title}
      </h3>

      {/* Content Preview */}
      <p className="text-sm text-nouveau-lavender-600 dark:text-nouveau-cream/80 mb-3 line-clamp-3">
        {previewContent}
      </p>

      {/* Metadata */}
      <div className="text-xs text-nouveau-lavender-500 dark:text-nouveau-cream/60">
        Created {new Date(workflow.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}
