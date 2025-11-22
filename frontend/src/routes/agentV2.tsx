import { createFileRoute } from '@tanstack/react-router'
import { AgentV2ChatPanel } from '../components/AgentV2ChatPanel'
import { AgentV2Provider } from '../contexts/AgentV2Context'
import { useFeatureFlag } from '../contexts/FeatureFlagContext'

export const Route = createFileRoute('/agentV2')({
  component: AgentV2Page,
})

function AgentV2Page() {
  const enableAgentV2 = useFeatureFlag('enableAgentV2')

  if (!enableAgentV2) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Agent V2 is disabled
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please enable the "Agent V2" feature flag to use this feature.
          </p>
        </div>
      </div>
    )
  }

  return (
    <AgentV2Provider>
      <AgentV2ChatPanel />
    </AgentV2Provider>
  )
}
