/**
 * Component to display workflow run history with pagination.
 */

import { useState } from 'react'
import { useWorkflowRuns } from '../hooks/useWorkflows'
import { WorkflowRun, ExecutionMessage } from '../types/workflow'

export function WorkflowRunHistory() {
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  const pageSize = 10

  const { data: runs = [], isLoading, error } = useWorkflowRuns(currentPage, pageSize)

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
        <p>Failed to load workflow runs</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }

  if (selectedRun) {
    return <WorkflowRunDetail run={selectedRun} onBack={() => setSelectedRun(null)} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-nouveau-lavender-200 dark:border-deco-gold/20">
        <h2 className="text-xl font-semibold text-nouveau-lavender-800 dark:text-deco-gold">
          Workflow Run History
        </h2>
        <p className="text-sm text-nouveau-lavender-600 dark:text-nouveau-cream/80 mt-1">
          View past workflow executions and their results
        </p>
      </div>

      {/* Runs List */}
      <div className="flex-1 overflow-y-auto p-6">
        {runs.length === 0 ? (
          <div className="text-center py-12 text-nouveau-lavender-600 dark:text-nouveau-cream/60">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium mb-2">No workflow runs yet</p>
            <p className="text-sm">Execute some workflows to see their history here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <WorkflowRunCard
                key={run._id}
                run={run}
                onViewDetails={() => setSelectedRun(run)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {runs.length === pageSize && (
        <div className="p-6 border-t border-nouveau-lavender-200 dark:border-deco-gold/20 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 text-sm rounded-md bg-nouveau-lavender-100 dark:bg-deco-navy-400 text-nouveau-lavender-800 dark:text-nouveau-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-300 transition-colors"
          >
            Previous
          </button>
          
          <span className="text-sm text-nouveau-lavender-600 dark:text-nouveau-cream/80">
            Page {currentPage + 1}
          </span>
          
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={runs.length < pageSize}
            className="px-4 py-2 text-sm rounded-md bg-nouveau-lavender-100 dark:bg-deco-navy-400 text-nouveau-lavender-800 dark:text-nouveau-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-300 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

interface WorkflowRunCardProps {
  run: WorkflowRun
  onViewDetails: () => void
}

function WorkflowRunCard({ run, onViewDetails }: WorkflowRunCardProps) {
  const statusColor = {
    running: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  }

  const statusIcon = {
    running: '⏳',
    completed: '✅',
    failed: '❌',
  }

  return (
    <div className="p-4 bg-white/60 dark:bg-deco-navy/20 backdrop-blur-sm border border-nouveau-lavender-200 dark:border-deco-gold/20 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-nouveau-lavender-800 dark:text-deco-gold truncate">
            {run.user_input}
          </p>
          <p className="text-xs text-nouveau-lavender-600 dark:text-nouveau-cream/60 mt-1">
            Run ID: {run._id}
          </p>
        </div>
        
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor[run.status]}`}>
          {statusIcon[run.status]} {run.status}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-nouveau-lavender-600 dark:text-nouveau-cream/60">
        <div>
          <span>Started: {new Date(run.created_at).toLocaleString()}</span>
          {run.completed_at && (
            <span className="ml-4">
              Completed: {new Date(run.completed_at).toLocaleString()}
            </span>
          )}
        </div>
        
        {run.artifact_paths.length > 0 && (
          <span className="text-nouveau-lavender-700 dark:text-deco-gold">
            📎 {run.artifact_paths.length} artifact{run.artifact_paths.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <button
        onClick={onViewDetails}
        className="mt-3 text-xs text-nouveau-lavender-600 dark:text-deco-gold hover:text-nouveau-lavender-800 dark:hover:text-deco-gold/80 font-medium"
      >
        View Details →
      </button>
    </div>
  )
}

interface WorkflowRunDetailProps {
  run: WorkflowRun
  onBack: () => void
}

function WorkflowRunDetail({ run, onBack }: WorkflowRunDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-nouveau-lavender-200 dark:border-deco-gold/20">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="text-nouveau-lavender-600 dark:text-deco-gold hover:text-nouveau-lavender-800 dark:hover:text-deco-gold/80"
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-nouveau-lavender-800 dark:text-deco-gold">
            Workflow Run Details
          </h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-nouveau-lavender-700 dark:text-deco-gold">Run ID:</span>
            <span className="ml-2 text-nouveau-lavender-600 dark:text-nouveau-cream/80 font-mono">{run._id}</span>
          </div>
          <div>
            <span className="font-medium text-nouveau-lavender-700 dark:text-deco-gold">Status:</span>
            <span className="ml-2 text-nouveau-lavender-600 dark:text-nouveau-cream/80">{run.status}</span>
          </div>
          <div>
            <span className="font-medium text-nouveau-lavender-700 dark:text-deco-gold">Started:</span>
            <span className="ml-2 text-nouveau-lavender-600 dark:text-nouveau-cream/80">
              {new Date(run.created_at).toLocaleString()}
            </span>
          </div>
          {run.completed_at && (
            <div>
              <span className="font-medium text-nouveau-lavender-700 dark:text-deco-gold">Completed:</span>
              <span className="ml-2 text-nouveau-lavender-600 dark:text-nouveau-cream/80">
                {new Date(run.completed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <span className="font-medium text-nouveau-lavender-700 dark:text-deco-gold">User Input:</span>
          <p className="mt-1 text-nouveau-lavender-600 dark:text-nouveau-cream/80 bg-nouveau-lavender-50 dark:bg-deco-navy/30 p-3 rounded-md">
            {run.user_input}
          </p>
        </div>

        {run.artifact_paths.length > 0 && (
          <div className="mt-4">
            <span className="font-medium text-nouveau-lavender-700 dark:text-deco-gold">Generated Artifacts:</span>
            <ul className="mt-1 space-y-1">
              {run.artifact_paths.map((path, index) => (
                <li key={index} className="text-nouveau-lavender-600 dark:text-nouveau-cream/80 font-mono text-sm bg-nouveau-lavender-50 dark:bg-deco-navy/30 p-2 rounded">
                  📎 {path}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Execution Log */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-lg font-medium text-nouveau-lavender-800 dark:text-deco-gold mb-4">
          Execution Log
        </h3>
        
        {run.execution_log.length === 0 ? (
          <p className="text-nouveau-lavender-600 dark:text-nouveau-cream/60">No execution log available</p>
        ) : (
          <div className="space-y-3">
            {run.execution_log.map((message, index) => (
              <ExecutionLogEntry key={index} message={message} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ExecutionLogEntryProps {
  message: ExecutionMessage
}

function ExecutionLogEntry({ message }: ExecutionLogEntryProps) {
  const timestamp = new Date(message.timestamp).toLocaleTimeString()

  switch (message.type) {
    case 'thinking':
      return (
        <div className="p-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">💭 Thinking</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">{timestamp}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      )
    
    case 'text':
      return (
        <div className="p-3 bg-white dark:bg-deco-navy/30 border border-nouveau-lavender-200 dark:border-deco-gold/20 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-nouveau-lavender-700 dark:text-deco-gold text-sm font-medium">💬 Response</span>
            <span className="text-nouveau-lavender-500 dark:text-nouveau-cream/60 text-xs">{timestamp}</span>
          </div>
          <p className="text-nouveau-lavender-800 dark:text-nouveau-cream text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      )
    
    case 'tool_use':
      return (
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-purple-800 dark:text-purple-200 text-sm font-medium">
              🔧 Tool: {message.toolName}
            </span>
            <span className="text-purple-600 dark:text-purple-300 text-xs">{timestamp}</span>
          </div>
          <pre className="text-purple-700 dark:text-purple-300 text-xs bg-purple-50 dark:bg-purple-900/50 p-2 rounded overflow-x-auto">
            {JSON.stringify(message.toolInput, null, 2)}
          </pre>
        </div>
      )
    
    case 'tool_result':
      return (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-green-800 dark:text-green-200 text-sm font-medium">✅ Tool Result</span>
            <span className="text-green-600 dark:text-green-300 text-xs">{timestamp}</span>
          </div>
          <p className="text-green-700 dark:text-green-300 text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      )
    
    case 'error':
      return (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-red-800 dark:text-red-200 text-sm font-medium">❌ Error</span>
            <span className="text-red-600 dark:text-red-300 text-xs">{timestamp}</span>
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      )
    
    default:
      return (
        <div className="p-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{message.type}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">{timestamp}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      )
  }
}
