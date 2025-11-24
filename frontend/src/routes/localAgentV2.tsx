import { createFileRoute } from '@tanstack/react-router'
import { LocalAgentV2ChatPanel } from '../components/LocalAgentV2ChatPanel'
import { LocalAgentV2Provider } from '../contexts/LocalAgentV2Context'
import { useFeatureFlag } from '../contexts/FeatureFlagContext'

export const Route = createFileRoute('/localAgentV2')({
  component: LocalAgentV2Page,
})

function LocalAgentV2Page() {
  const enableLocalTesting = useFeatureFlag('enableLocalTesting')

  if (!enableLocalTesting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Local Testing is disabled
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please enable the "Local Testing" feature flag to use this feature.
          </p>
        </div>
      </div>
    )
  }

  return (
    <LocalAgentV2Provider>
      <LocalAgentV2ChatPanel />
    </LocalAgentV2Provider>
  )
}
