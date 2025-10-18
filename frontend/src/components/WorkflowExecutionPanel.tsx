/**
 * Panel for executing workflows with streaming results.
 */

import { useState } from 'react'
import { useWorkflowExecution } from '../hooks/useWorkflows'
import { Workflow, ExecutionMessage } from '../types/workflow'
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

      {/* Execution Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
            <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-nouveau-lavender-800 dark:text-deco-gold">
              Execution Log
            </h3>

            <div className="space-y-3">
              {events.map((event, index) => (
                <ExecutionEventCard key={index} event={event} />
              ))}
            </div>

            {/* Show completion status */}
            {events.some(e => e.type === 'complete') && (
              <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-md">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✅ Workflow completed successfully
                </p>
                {events.find(e => e.type === 'complete' && e.artifact_paths)?.artifact_paths?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                      Generated Artifacts:
                    </p>
                    <ul className="text-green-700 dark:text-green-300 text-sm mt-1">
                      {events.find(e => e.type === 'complete')?.artifact_paths?.map((path, i) => (
                        <li key={i} className="font-mono">{path}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {events.length === 0 && !error && !isExecuting && (
          <div className="text-center py-12 text-nouveau-lavender-600 dark:text-nouveau-cream/60">
            <div className="text-4xl mb-4">🚀</div>
            <p>Ready to execute workflow</p>
            <p className="text-sm mt-1">Enter your input above and click Execute</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface ExecutionEventCardProps {
  event: any // WorkflowExecutionEvent but with flexible data
}

function ExecutionEventCard({ event }: ExecutionEventCardProps) {
  if (event.type === 'start') {
    return (
      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-md">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          🚀 Workflow execution started
        </p>
      </div>
    )
  }

  // Handle message events (thinking, text, tool_use, tool_result)
  // Check if event has data property or is the message directly
  const message = event.data || event

  if (message && typeof message === 'object' && message.type) {
    switch (message.type) {
      case 'thinking':
        return (
          <div className="p-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md">
            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">💭 Thinking</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        )

      case 'text':
        return (
          <div className="p-3 bg-white dark:bg-deco-navy/30 border border-nouveau-lavender-200 dark:border-deco-gold/20 rounded-md">
            <p className="text-nouveau-lavender-800 dark:text-nouveau-cream text-sm whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        )

      case 'tool_use':
        return (
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded-md">
            <p className="text-purple-800 dark:text-purple-200 text-sm font-medium mb-1">
              🔧 Tool: {message.toolName}
            </p>
            <pre className="text-purple-700 dark:text-purple-300 text-xs bg-purple-50 dark:bg-purple-900/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(message.toolInput, null, 2)}
            </pre>
          </div>
        )

      case 'tool_result':
        return (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-md">
            <p className="text-green-800 dark:text-green-200 text-sm font-medium mb-1">
              ✅ Tool Result
            </p>
            <p className="text-green-700 dark:text-green-300 text-sm whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        )

      default:
        return (
          <div className="p-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              {message.type}: {message.content}
            </p>
          </div>
        )
    }
  }

  return null
}
