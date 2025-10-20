/**
 * Panel for executing workflows with streaming results.
 */

import { useState } from 'react'
import { useWorkflowExecution } from '../hooks/useWorkflows'
import type { Workflow } from '../types/workflow'
import { StreamingMessagePanel } from './StreamingMessagePanel'
import { ExecutionEventCard } from './ExecutionEventCard'
import ReactMarkdown from 'react-markdown'

interface WorkflowExecutionPanelProps {
  selectedWorkflow: Workflow | null
}

export function WorkflowExecutionPanel({ selectedWorkflow }: WorkflowExecutionPanelProps) {
  const [userInput, setUserInput] = useState('')
  const { executeWorkflow, clearExecution, isExecuting, currentRunId, events, error } = useWorkflowExecution()

  const handleExecute = async () => {
    if (!selectedWorkflow || !userInput.trim()) return

    await executeWorkflow(selectedWorkflow._id, userInput.trim())
  }

  const handleClear = () => {
    clearExecution()
    setUserInput('')
  }

  if (!selectedWorkflow) {
    return (
      <div className="flex items-center justify-center h-full text-nouveau-lavender-600 dark:text-nouveau-cream/60">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-lg font-medium mb-2">Select a Workflow</p>
          <p className="text-sm">Choose a workflow from the left panel to get started</p>
        </div>
      </div>
    )
  }

  const completionEvent = events.find(e => e.type === 'complete')

  return (
    <div className="flex flex-col h-full">
      {/* Selected Workflow Info */}
      <div className="p-6 border-b border-nouveau-lavender-200 dark:border-deco-gold/20 bg-white/40 dark:bg-deco-navy/40 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-nouveau-lavender-800 dark:text-deco-gold mb-2">
          {selectedWorkflow.title}
        </h2>
        <div className="text-sm text-nouveau-lavender-600 dark:text-nouveau-cream/80 max-h-20 overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert">
            <ReactMarkdown>
              {selectedWorkflow.content.substring(0, 200) + (selectedWorkflow.content.length > 200 ? '...' : '')}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-6 border-b border-nouveau-lavender-200 dark:border-deco-gold/20 bg-white/20 dark:bg-deco-navy/20">
        <label className="block text-sm font-medium text-nouveau-lavender-800 dark:text-deco-gold mb-2">
          Natural Language Input
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Describe what you want the workflow to do..."
          className="w-full h-24 px-3 py-2 border border-nouveau-lavender-300 dark:border-deco-gold/30 rounded-md bg-white/80 dark:bg-deco-navy/60 text-nouveau-lavender-800 dark:text-nouveau-cream placeholder-nouveau-lavender-500 dark:placeholder-nouveau-cream/50 focus:ring-2 focus:ring-nouveau-lavender-400 dark:focus:ring-deco-gold focus:border-transparent resize-none"
          disabled={isExecuting}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleExecute}
            disabled={!userInput.trim() || isExecuting}
            className="px-6 py-2 bg-nouveau-lavender-500 dark:bg-deco-gold text-white dark:text-deco-navy font-medium rounded-md hover:bg-nouveau-lavender-600 dark:hover:bg-deco-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>

          {(events.length > 0 || error) && (
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-gray-500 text-white font-medium rounded-md hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {currentRunId && (
          <div className="mt-2 text-xs text-nouveau-lavender-600 dark:text-nouveau-cream/60">
            Run ID: {currentRunId}
          </div>
        )}
      </div>

      {/* Streaming Message Panel - Execution Results */}
      <StreamingMessagePanel
        messages={events}
        error={error}
        messageRenderer={ExecutionEventCard}
        emptyStateIcon="🚀"
        emptyStateTitle="Ready to execute workflow"
        emptyStateDescription="Enter your input above and click Execute"
      />

      {/* Completion Status & Artifacts */}
      {completionEvent && (
        <div className="px-6 py-4 border-t border-nouveau-lavender-200 dark:border-deco-gold/20 bg-green-50 dark:bg-green-900/20">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-md">
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✅ Workflow completed successfully
            </p>
            {completionEvent.artifact_paths && completionEvent.artifact_paths.length > 0 && (
              <div className="mt-2">
                <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                  Generated Artifacts:
                </p>
                <ul className="text-green-700 dark:text-green-300 text-sm mt-1">
                  {completionEvent.artifact_paths.map((path, i) => (
                    <li key={i} className="font-mono">{path}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
