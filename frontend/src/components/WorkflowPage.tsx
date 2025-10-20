/**
 * Main Workflow page with two-panel layout.
 */

import { useState } from 'react'
import { WorkflowList } from './WorkflowList.tsx'
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel.tsx'
import { WorkflowRunHistory } from './WorkflowRunHistory.tsx'
import type { Workflow } from '../types/workflow'

export function WorkflowPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [activeTab, setActiveTab] = useState<'execute' | 'history'>('execute')

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-nouveau-lavender-50 via-nouveau-rose-50 to-nouveau-mint-50 dark:from-deco-navy-600 dark:via-deco-burgundy-500 dark:to-deco-emerald-600">
      {/* Left Panel - Available Workflows */}
      <div className="w-1/3 border-r border-nouveau-lavender-200 dark:border-deco-gold/20 bg-white/60 dark:bg-deco-navy/60 backdrop-blur-sm">
        <div className="p-6 border-b border-nouveau-lavender-200 dark:border-deco-gold/20">
          <h1 className="text-2xl font-bold text-nouveau-lavender-800 dark:text-deco-gold">
            Workflows
          </h1>
          <p className="text-sm text-nouveau-lavender-600 dark:text-nouveau-cream/80 mt-1">
            Select a workflow to execute
          </p>
        </div>

        <div className="h-[calc(100%-5rem)] overflow-hidden">
          <WorkflowList
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={setSelectedWorkflow}
          />
        </div>
      </div>

      {/* Right Panel - Execution Interface & History */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Navigation */}
        <div className="flex border-b border-nouveau-lavender-200 dark:border-deco-gold/20 bg-white/40 dark:bg-deco-navy/40 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('execute')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'execute'
                ? 'text-nouveau-lavender-800 dark:text-deco-gold border-b-2 border-nouveau-lavender-400 dark:border-deco-gold'
                : 'text-nouveau-lavender-600 dark:text-nouveau-cream/80 hover:text-nouveau-lavender-700 dark:hover:text-deco-gold/80'
            }`}
          >
            Execute Workflow
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-nouveau-lavender-800 dark:text-deco-gold border-b-2 border-nouveau-lavender-400 dark:border-deco-gold'
                : 'text-nouveau-lavender-600 dark:text-nouveau-cream/80 hover:text-nouveau-lavender-700 dark:hover:text-deco-gold/80'
            }`}
          >
            Run History
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'execute' ? (
            <WorkflowExecutionPanel selectedWorkflow={selectedWorkflow} />
          ) : (
            <WorkflowRunHistory />
          )}
        </div>
      </div>
    </div>
  )
}
