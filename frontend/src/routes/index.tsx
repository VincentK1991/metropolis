/**
 * Workspace list route - / (home page)
 * Legacy agent v1 workspace page - hidden by default
 * Redirects to Agent V2 if legacy home is disabled
 */

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { WorkspaceList } from '../components/WorkspaceList'
import { useFeatureFlag } from '../contexts/FeatureFlagContext'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const enableLegacyHome = useFeatureFlag('enableLegacyHome')
  const enableAgentV2 = useFeatureFlag('enableAgentV2')

  // If legacy home is disabled, redirect to Agent V2 if available, otherwise show message
  if (!enableLegacyHome) {
    if (enableAgentV2) {
      return <Navigate to="/agentV2" replace />
    }
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Legacy Home Page is disabled
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The legacy workspace page (Agent V1) is hidden by default.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Enable the "Enable Legacy Home" feature flag to access it.
          </p>
        </div>
      </div>
    )
  }

  return <WorkspaceList />
}
